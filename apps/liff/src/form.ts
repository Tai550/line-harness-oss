declare const liff: {
  getAccessToken: () => string;
  getProfile: () => Promise<{ userId: string }>;
};

interface FormField {
  name: string;
  label: string;
  type: "text" | "email" | "textarea" | "select" | "radio" | "checkbox";
  required?: boolean;
  options?: string[];
}

interface FormDefinition {
  id: number;
  name: string;
  description: string | null;
  fields: string;
}

export async function initForm(app: HTMLElement, apiUrl: string, formId: string) {
  if (!formId) {
    app.innerHTML = '<div class="container"><div class="card"><h1>エラー</h1><p>フォームIDが指定されていません。</p></div></div>';
    return;
  }

  const res = await fetch(`${apiUrl}/api/forms/${formId}`);
  const data = await res.json() as { success: boolean; data: FormDefinition };
  if (!data.success) {
    app.innerHTML = '<div class="container"><div class="card"><h1>エラー</h1><p>フォームが見つかりません。</p></div></div>';
    return;
  }

  const form = data.data;
  const fields: FormField[] = JSON.parse(form.fields);

  const fieldsHtml = fields.map((field) => {
    const required = field.required ? 'required' : '';
    let input = '';
    if (field.type === 'textarea') {
      input = `<textarea name="${field.name}" ${required} rows="4"></textarea>`;
    } else if (field.type === 'select') {
      const options = (field.options ?? []).map((o) => `<option value="${o}">${o}</option>`).join("");
      input = `<select name="${field.name}" ${required}><option value="">選択してください</option>${options}</select>`;
    } else if (field.type === 'radio' && field.options) {
      input = field.options.map((o) => `<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><input type="radio" name="${field.name}" value="${o}" ${required}>${o}</label>`).join("");
    } else if (field.type === 'checkbox' && field.options) {
      input = field.options.map((o) => `<label style="display:flex;align-items:center;gap:8px;margin-bottom:8px;"><input type="checkbox" name="${field.name}" value="${o}">${o}</label>`).join("");
    } else {
      input = `<input type="${field.type}" name="${field.name}" ${required} />`;
    }
    return `<div><label>${field.label}${field.required ? ' <span style="color:red">*</span>' : ''}</label>${input}</div>`;
  }).join("");

  app.innerHTML = `
    <div class="container">
      <div class="card">
        <h1>${form.name}</h1>
        ${form.description ? `<p style="margin-bottom:16px">${form.description}</p>` : ''}
        <form id="liffForm">
          ${fieldsHtml}
          <button type="submit" class="btn">送信する</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById("liffForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formEl = e.target as HTMLFormElement;
    const formData = new FormData(formEl);
    const submitData: Record<string, unknown> = {};
    formData.forEach((value, key) => {
      if (submitData[key]) {
        submitData[key] = Array.isArray(submitData[key]) ? [...(submitData[key] as string[]), String(value)] : [submitData[key], String(value)];
      } else {
        submitData[key] = String(value);
      }
    });

    let lineUserId: string | undefined;
    try {
      const profile = await liff.getProfile();
      lineUserId = profile.userId;
    } catch {
      // not logged in
    }

    await fetch(`${apiUrl}/api/forms/${formId}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineUserId, data: submitData }),
    });

    app.innerHTML = `
      <div class="container">
        <div class="card success">
          <div class="icon">✅</div>
          <h1>送信完了</h1>
          <p>ご回答ありがとうございました。</p>
        </div>
      </div>
    `;
  });
}
