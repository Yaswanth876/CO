const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:5000`;

const TOKEN_KEY = "coas-token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        message = errorPayload.error;
      }
    } catch {
      // Preserve default message when backend response is not JSON.
    }

    if (response.status === 401) {
      clearToken();
      localStorage.removeItem("coas-user");
      window.dispatchEvent(new CustomEvent("coas-auth-expired"));
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function devLogin(email, password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
    .catch(async (error) => {
      if (password !== "tce123") {
        throw error;
      }

      await request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          full_name: email.split("@")[0],
        }),
      });

      return request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    })
    .then((data) => {
      setToken(data.token);
      return data.user;
    });
}

export function getSubjects() {
  return request("/api/subjects").then((data) =>
    (data.subjects || []).map((subject) => ({
      id: subject.id,
      code: subject.subject_code,
      name: subject.subject_name,
      semester: subject.semester ? `Semester ${subject.semester}` : "Semester",
      currentPhase: subject.current_phase,
      status: subject.status,
      raw: subject,
    }))
  );
}

export async function ensureSubject(subjectCode) {
  const subjects = await getSubjects();
  const existing = subjects.find((subject) => subject.code === subjectCode);
  if (existing) {
    return existing;
  }

  const created = await request("/api/subjects", {
    method: "POST",
    body: JSON.stringify({
      subject_code: subjectCode,
      subject_name: subjectCode,
      semester: 1,
    }),
  });

  const subject = created.subject;
  return {
    id: subject.id,
    code: subject.subject_code,
    name: subject.subject_name,
    semester: subject.semester ? `Semester ${subject.semester}` : "Semester",
    currentPhase: subject.current_phase,
    status: "active",
    raw: subject,
  };
}

export function getSubjectStatus(subjectId) {
  return request(`/api/subjects/${subjectId}`).then((data) => data.subject);
}

function mapUploadRoute(fileType) {
  if (fileType === "CAT1_QP") {
    return "/api/phase1/upload-qp";
  }

  if (fileType === "CAT1_MARKS") {
    return "/api/phase1/upload-marks";
  }

  if (fileType === "TERMINAL") {
    return "/api/phase3/upload-terminal";
  }

  return "/api/phase2/upload";
}

export async function uploadWorkspaceFile(subjectId, subjectCode, fileType, file) {
  const token = getToken();
  const formData = new FormData();
  formData.append("subject_id", String(subjectId));
  formData.append("subject_code", subjectCode);
  if (!["CAT1_QP", "CAT1_MARKS", "TERMINAL"].includes(fileType)) {
    formData.append("file_type", fileType);
  }
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}${mapUploadRoute(fileType)}`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed (${response.status})`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        message = errorPayload.error;
      }
    } catch {
      // Keep default when response is not JSON.
    }

    if (response.status === 401) {
      clearToken();
      localStorage.removeItem("coas-user");
      window.dispatchEvent(new CustomEvent("coas-auth-expired"));
    }

    throw new Error(message);
  }

  return response.json();
}

export function saveConfiguration(subjectId, payload) {
  return request(`/api/configuration/${subjectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getConfiguration(subjectId) {
  return request(`/api/configuration/${subjectId}`).then((data) => data.configuration);
}

export function processPhase1(subjectId) {
  return request("/api/phase1/process", {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId }),
  });
}

export function processPhase2(subjectId, templatePath) {
  const body = { subject_id: subjectId };
  if (templatePath) {
    body.template_path = templatePath;
  }

  return request("/api/phase2/process", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function processPhase3(subjectId) {
  return request("/api/phase3/finalize", {
    method: "POST",
    body: JSON.stringify({ subject_id: subjectId }),
  });
}

export async function downloadReportFileByOutputId(outputId, outputType = "report") {
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/api/reports/download/${outputId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let message = `Download failed (${response.status})`;
    try {
      const errorPayload = await response.json();
      if (errorPayload?.error) {
        message = errorPayload.error;
      }
    } catch {
      // Keep default when response is not JSON.
    }

    if (response.status === 401) {
      clearToken();
      localStorage.removeItem("coas-user");
      window.dispatchEvent(new CustomEvent("coas-auth-expired"));
    }

    throw new Error(message);
  }

  const blob = await response.blob();
  return { blob, suggestedName: `${outputType}.xlsx` };
}

export function getProfile(email) {
  const userRaw = localStorage.getItem("coas-user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  return Promise.resolve({
    name: user?.full_name || user?.email?.split("@")[0] || "Staff User",
    email: email || user?.email || "",
    department: "Computer Science and Engineering",
    role: user?.role || "faculty",
    employeeId: "TCE-FAC-0000",
  });
}

export function updatePassword(payload) {
  return request("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getReports() {
  const subjects = await getSubjects();
  const reportRows = [];

  for (const subject of subjects) {
    const data = await request(`/api/reports/${subject.id}`);
    const reports = data.reports || [];
    const final = reports.find((report) => report.type === "CO_ATTAINMENT_COMPLETE");

    reportRows.push({
      id: String(subject.id),
      subjectId: subject.id,
      subjectCode: subject.code,
      subjectName: subject.name,
      semester: subject.semester,
      status: final ? "Generated" : "Pending",
      generatedOn: final ? new Date(final.generated_at).toLocaleString() : "",
      outputId: final ? final.id : null,
      outputType: final ? final.type : null,
    });
  }

  return reportRows;
}

export function logout() {
  clearToken();
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}
