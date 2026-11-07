import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  submitReportApi,
  getLeadsApi,
  getAuditLogsApi,
  deleteLeadApi,
  submitEnquiryApi,
  getEnquiriesApi,
  deleteEnquiryApi,
  getMyAssessmentsApi,
  deleteAssessmentApi,
  submitFormResponseApi,
  getFormResponsesApi,
  updateFormResponseStatusApi,
  deleteFormResponseApi
} from "../services/api";

const AppContext = createContext(null);

const STORAGE_LEADS_KEY = "ff_leads_db";
const STORAGE_LOGS_KEY = "ff_audit_logs_db";
const STORAGE_ENQUIRIES_KEY = "ff_contact_enquiries_db";
const STORAGE_USER_ASSESSMENTS_KEY = "ff_user_assessments_db";
const STORAGE_FORM_RESPONSES_KEY = "ff_form_responses_db";

export function AppProvider({ children }) {
  const [leads, setLeads] = useState(() => {
    try {
      const localSaved = localStorage.getItem(STORAGE_LEADS_KEY);
      return localSaved ? JSON.parse(localSaved) : [];
    } catch {
      return [];
    }
  });

  const [userAssessments, setUserAssessments] = useState(() => {
    try {
      const localSaved = localStorage.getItem(STORAGE_USER_ASSESSMENTS_KEY);
      return localSaved ? JSON.parse(localSaved) : [];
    } catch {
      return [];
    }
  });

  const [contactEnquiries, setContactEnquiries] = useState(() => {
    try {
      const localSaved = localStorage.getItem(STORAGE_ENQUIRIES_KEY);
      return localSaved ? JSON.parse(localSaved) : [];
    } catch {
      return [];
    }
  });

  const [formResponses, setFormResponses] = useState(() => {
    try {
      const localSaved = localStorage.getItem(STORAGE_FORM_RESPONSES_KEY);
      return localSaved ? JSON.parse(localSaved) : [];
    } catch {
      return [];
    }
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [activeLead, setActiveLead] = useState(null);
  const [loadingAssessments, setLoadingAssessments] = useState(false);

  const refreshBackendData = async () => {
    const backendLeads = await getLeadsApi();
    if (backendLeads && Array.isArray(backendLeads)) {
      setLeads(backendLeads);
      if (backendLeads.length > 0 && !activeLead) {
        setActiveLead(backendLeads[0]);
      }
      try {
        localStorage.setItem(STORAGE_LEADS_KEY, JSON.stringify(backendLeads));
      } catch (e) {}
    }

    const backendEnquiries = await getEnquiriesApi();
    if (backendEnquiries && Array.isArray(backendEnquiries)) {
      setContactEnquiries(backendEnquiries);
      try {
        localStorage.setItem(STORAGE_ENQUIRIES_KEY, JSON.stringify(backendEnquiries));
      } catch (e) {}
    }

    const backendForms = await getFormResponsesApi();
    if (backendForms && Array.isArray(backendForms)) {
      setFormResponses(backendForms);
      try {
        localStorage.setItem(STORAGE_FORM_RESPONSES_KEY, JSON.stringify(backendForms));
      } catch (e) {}
    }

    const backendLogs = await getAuditLogsApi();
    if (backendLogs && Array.isArray(backendLogs)) {
      setAuditLogs(backendLogs);
    }
  };

  const fetchUserAssessments = useCallback(async (userData) => {
    if (!userData || (!userData.id && !userData.uid && !userData.email && !userData.mobile)) {
      setUserAssessments([]);
      return;
    }
    setLoadingAssessments(true);
    try {
      const uId = userData.id || userData.uid || "";
      const uEmail = (userData.email || "").trim();
      const uMob = (userData.mobile || "").trim();
      const cleanMob = uMob.replace(/\D/g, "").slice(-10);

      const backendData = await getMyAssessmentsApi({
        userId: uId,
        email: uEmail,
        mobile: cleanMob || uMob
      });

      // Get any local assessments saved in browser
      let localItems = [];
      try {
        const localUserSaved = localStorage.getItem(STORAGE_USER_ASSESSMENTS_KEY);
        const localLeadsSaved = localStorage.getItem(STORAGE_LEADS_KEY);
        const allLocal = [
          ...(localUserSaved ? JSON.parse(localUserSaved) : []),
          ...(localLeadsSaved ? JSON.parse(localLeadsSaved) : [])
        ];
        localItems = allLocal.filter((l) => {
          if (!l) return false;
          const emailMatch = uEmail && l.email && l.email.toLowerCase() === uEmail.toLowerCase();
          const lCleanMob = (l.mobile || "").replace(/\D/g, "").slice(-10);
          const mobMatch = cleanMob && lCleanMob && (lCleanMob === cleanMob || l.mobile.includes(cleanMob));
          const idMatch = l.userId && (l.userId === uId || l.userId === userData.uid);
          return emailMatch || mobMatch || idMatch;
        });
      } catch (e) {}

      if (backendData && Array.isArray(backendData)) {
        // Merge backendData with local items without duplicates
        const merged = [...backendData];
        localItems.forEach((item) => {
          const exists = merged.some((m) => (m.id && m.id === item.id) || (m._id && m._id === item._id));
          if (!exists) {
            merged.push(item);
          }
        });
        setUserAssessments(merged);
        try {
          localStorage.setItem(STORAGE_USER_ASSESSMENTS_KEY, JSON.stringify(merged));
        } catch (e) {}
      } else if (localItems.length > 0) {
        setUserAssessments(localItems);
      }
    } finally {
      setLoadingAssessments(false);
    }
  }, []);

  useEffect(() => {
    refreshBackendData();
  }, []);

  const addAuditLog = (type, user, status, details) => {
    const newLog = {
      id: "log-" + Date.now(),
      timestamp: new Date().toISOString(),
      type,
      user: user || "Anonymous",
      status,
      details
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const saveContactEnquiry = async (enquiryData) => {
    const res = await submitEnquiryApi(enquiryData);
    const rawEnq = res.enquiry || {};

    const newEnquiry = {
      id: rawEnq._id || rawEnq.id || "enq_" + Date.now(),
      name: enquiryData.name || "Client User",
      email: enquiryData.email || "",
      topic: enquiryData.topic || "General Enquiry",
      message: enquiryData.message || "",
      submittedAt: rawEnq.createdAt || new Date().toISOString()
    };

    setContactEnquiries((prev) => {
      const updated = [newEnquiry, ...prev];
      try {
        localStorage.setItem(STORAGE_ENQUIRIES_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    addAuditLog("Advisory Enquiry", newEnquiry.email || newEnquiry.name, "Success", `Contact enquiry: ${newEnquiry.topic}`);
    return newEnquiry;
  };

  const deleteContactEnquiry = async (enquiryId) => {
    await deleteEnquiryApi(enquiryId);
    setContactEnquiries((prev) => {
      const updated = prev.filter((e) => e.id !== enquiryId && e._id !== enquiryId);
      try {
        localStorage.setItem(STORAGE_ENQUIRIES_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    addAuditLog("Enquiry Management", "Admin", "Success", `Contact enquiry deleted: ${enquiryId}`);
  };

  const saveFormResponse = async (formData) => {
    const res = await submitFormResponseApi(formData);
    const rawRes = res.formResponse || {};

    const newResponse = {
      id: rawRes._id || rawRes.id || "fr_" + Date.now(),
      _id: rawRes._id || rawRes.id || "fr_" + Date.now(),
      name: formData.name || "Applicant",
      email: formData.email || "",
      mobile: formData.mobile || "",
      city: formData.city || "",
      education: formData.education || "",
      profession: formData.profession || "",
      status: rawRes.status || "new",
      source: "Forms Portal (/forms)",
      referralCode: rawRes.referralCode || formData.referralCode || "",
      sourceAdvisor: rawRes.sourceAdvisor || null,
      assignedTo: rawRes.assignedTo || null,
      submittedAt: rawRes.createdAt || new Date().toISOString(),
      createdAt: rawRes.createdAt || new Date().toISOString()
    };

    setFormResponses((prev) => {
      const updated = [newResponse, ...prev.filter((item) => item.id !== newResponse.id && item._id !== newResponse.id)];
      try {
        localStorage.setItem(STORAGE_FORM_RESPONSES_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    // Also reflect in CRM leads list
    const newLeadFromForm = {
      id: res.leadId || "lead_form_" + Date.now(),
      _id: res.leadId || "lead_form_" + Date.now(),
      name: newResponse.name,
      email: newResponse.email,
      mobile: newResponse.mobile,
      city: newResponse.city,
      leadStatus: "new",
      referralCode: newResponse.referralCode,
      sourceAdvisor: newResponse.sourceAdvisor,
      assignedTo: newResponse.assignedTo,
      goals: [newResponse.profession, newResponse.education].filter(Boolean),
      submittedAt: newResponse.submittedAt,
      createdAt: newResponse.createdAt,
      source: "Forms Portal (/forms)"
    };

    setLeads((prev) => {
      const updated = [newLeadFromForm, ...prev.filter((l) => l.id !== newLeadFromForm.id)];
      try {
        localStorage.setItem(STORAGE_LEADS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    addAuditLog("Form Application", newResponse.email || newResponse.mobile || newResponse.name, "Success", `Form response from: ${newResponse.name} (${newResponse.city})`);
    return newResponse;
  };

  const updateFormResponseStatus = async (id, status, notes = "", token = "") => {
    await updateFormResponseStatusApi(id, { status, noteText: notes }, token);
    setFormResponses((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id || item._id === id) {
          return { ...item, status };
        }
        return item;
      });
      try {
        localStorage.setItem(STORAGE_FORM_RESPONSES_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const deleteFormResponse = async (id, token = "") => {
    await deleteFormResponseApi(id, token);
    setFormResponses((prev) => {
      const updated = prev.filter((item) => item.id !== id && item._id !== id);
      try {
        localStorage.setItem(STORAGE_FORM_RESPONSES_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    addAuditLog("Form Management", "Admin", "Success", `Form response deleted: ${id}`);
  };

  const saveLeadSubmission = async (leadData, currentUser = null) => {
    const storedRef = (typeof window !== "undefined" && window.localStorage) ? (localStorage.getItem("ff_referral_code") || sessionStorage.getItem("ff_referral_code") || "") : "";
    const payload = {
      ...leadData,
      userId: currentUser?.id || leadData.userId || "",
      referralCode: leadData.referralCode || storedRef
    };
    const res = await submitReportApi(payload);
    const rawReport = res.report || {};

    const newLead = {
      id: rawReport._id || rawReport.id || "lead_" + Date.now(),
      userId: payload.userId,
      name: leadData.name || "Client User",
      email: leadData.email || "",
      mobile: leadData.mobile || "",
      age: String(leadData.age || ""),
      income: String(leadData.income || "0"),
      expenses: String(leadData.expenses || "0"),
      savings: String(leadData.savings || "0"),
      city: leadData.city || "",
      retirementAge: String(leadData.retirementAge || "60"),
      termInsurance: leadData.termInsurance || "no",
      termAmount: String(leadData.termAmount || "0"),
      healthInsurance: leadData.healthInsurance || "no",
      healthAmount: String(leadData.healthAmount || "0"),
      goals: Array.isArray(leadData.goals) ? leadData.goals : [],
      pdfUrl: res.pdfUrl || rawReport.pdfUrl,
      sourceAdvisor: rawReport.sourceAdvisor || (res.report?.sourceAdvisor) || null,
      assignedTo: rawReport.assignedTo || (res.report?.assignedTo) || null,
      referralCode: rawReport.referralCode || payload.referralCode || storedRef || "",
      submittedAt: rawReport.createdAt || new Date().toISOString()
    };

    setLeads((prev) => {
      const updated = [newLead, ...prev.filter((item) => item.id !== newLead.id && item._id !== newLead.id)];
      try {
        localStorage.setItem(STORAGE_LEADS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setUserAssessments((prev) => {
      const updated = [newLead, ...prev.filter((item) => item.id !== newLead.id && item._id !== newLead.id)];
      try {
        localStorage.setItem(STORAGE_USER_ASSESSMENTS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setActiveLead(newLead);
    addAuditLog("Report Generation", newLead.email, "Success", `Lead submitted: ${newLead.name}`);

    if (currentUser) {
      fetchUserAssessments(currentUser).catch(() => {});
    }

    return newLead;
  };

  const deleteLead = async (leadId) => {
    await deleteLeadApi(leadId);
    setLeads((prev) => {
      const updated = prev.filter((l) => l.id !== leadId && l._id !== leadId);
      try {
        localStorage.setItem(STORAGE_LEADS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setUserAssessments((prev) => {
      const updated = prev.filter((l) => l.id !== leadId && l._id !== leadId);
      try {
        localStorage.setItem(STORAGE_USER_ASSESSMENTS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    if (activeLead && (activeLead.id === leadId || activeLead._id === leadId)) {
      setActiveLead(null);
    }
    addAuditLog("Lead Management", "Admin", "Success", `Lead deleted: ${leadId}`);
  };

  const deleteUserAssessment = async (leadId) => {
    await deleteAssessmentApi(leadId);
    setUserAssessments((prev) => {
      const updated = prev.filter((l) => l.id !== leadId && l._id !== leadId);
      try {
        localStorage.setItem(STORAGE_USER_ASSESSMENTS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
    setLeads((prev) => {
      const updated = prev.filter((l) => l.id !== leadId && l._id !== leadId);
      try {
        localStorage.setItem(STORAGE_LEADS_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  return (
    <AppContext.Provider
      value={{
        leads,
        activeLead,
        setActiveLead,
        userAssessments,
        fetchUserAssessments,
        loadingAssessments,
        deleteUserAssessment,
        contactEnquiries,
        saveContactEnquiry,
        deleteContactEnquiry,
        formResponses,
        saveFormResponse,
        updateFormResponseStatus,
        deleteFormResponse,
        auditLogs,
        addAuditLog,
        saveLeadSubmission,
        deleteLead,
        refreshBackendData
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within an AppProvider");
  return ctx;
}
