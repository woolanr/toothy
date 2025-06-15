// frontend/public/js/doctorDashboard.js
document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://localhost:3000/dokter";

  const doctorPortal = document.getElementById("doctor-portal");

  const navDashboard = document.getElementById("nav-dashboard");
  const navProfile = document.getElementById("nav-profile");
  const navExamination = document.getElementById("nav-examination");
  const logoutBtn = document.getElementById("logout-btn");

  const dashboardContent = document.getElementById("dashboard-content");
  const profileContent = document.getElementById("profile-content");
  const examinationContent = document.getElementById("examination-content");

  const upcomingAppointmentsDiv = document.getElementById(
    "upcoming-appointments"
  );
  const patientQueueDiv = document.getElementById("patient-queue");
  const doctorScheduleDiv = document.getElementById("doctor-schedule");
  const manageScheduleBtn = document.getElementById("manage-schedule-btn");

  const profileForm = document.getElementById("profile-form");
  const profilePicPreview = document.getElementById("profile-pic-preview");
  const fotoProfilUrlInput = document.getElementById("foto_profil_url");
  const profilePicUploadInput = document.getElementById("profile-pic-upload");
  const namaLengkapInput = document.getElementById("nama_lengkap");
  const emailInput = document.getElementById("email");
  const noTeleponInput = document.getElementById("no_telepon");
  const tanggalLahirInput = document.getElementById("tanggal_lahir");
  const jenisKelaminSelect = document.getElementById("jenis_kelamin");
  const nikInput = document.getElementById("nik");
  const alamatInput = document.getElementById("alamat");
  const spesialisasiInput = document.getElementById("spesialisasi");
  const lisensiNoInput = document.getElementById("lisensi_no");
  const pengalamanTahunInput = document.getElementById("pengalaman_tahun");
  const ratingRata2P = document.getElementById("rating_rata2");
  const profileMessage = document.getElementById("profile-message");

  const patientNamaLengkapSpan = document.getElementById(
    "patient-nama_lengkap"
  );
  const patientTanggalLahirSpan = document.getElementById(
    "patient-tanggal_lahir"
  );
  const patientJenisKelaminSpan = document.getElementById(
    "patient-jenis_kelamin"
  );
  const patientNoTeleponSpan = document.getElementById("patient-no_telepon");
  const patientEmailSpan = document.getElementById("patient-email");
  const patientNikSpan = document.getElementById("patient-nik");
  const patientAlamatSpan = document.getElementById("patient-alamat");
  const currentPatientProfileIdInput = document.getElementById(
    "current-patient-profile-id"
  );
  const medicalHistoryListDiv = document.getElementById("medical-history-list");

  const examinationForm = document.getElementById("examination-form");
  const chiefComplaintInput = document.getElementById("chief_complaint");
  const dentalExaminationFindingsInput = document.getElementById(
    "dental_examination_findings"
  );
  const diagnosisInput = document.getElementById("diagnosis");
  const treatmentPlanInput = document.getElementById("treatment_plan");
  const actionsTakenInput = document.getElementById("actions_taken");
  const doctorNotesInput = document.getElementById("doctor_notes");
  const examinationMessage = document.getElementById("examination-message");

  // Modals
  const modalBackdrop = document.getElementById("modal-backdrop");
  const scheduleModal = document.getElementById("schedule-modal");
  const scheduleModalTitle = document.getElementById("schedule-modal-title");
  const closeScheduleModalBtn = document.getElementById("close-schedule-modal");
  const scheduleForm = document.getElementById("schedule-form");
  const modalIdSchedule = document.getElementById("modal-id-schedule");
  const modalHariDalamMinggu = document.getElementById(
    "modal-hari-dalam-minggu"
  );
  const modalWaktuMulai = document.getElementById("modal-waktu-mulai");
  const modalWaktuSelesai = document.getElementById("modal-waktu-selesai");
  const modalIsAvailable = document.getElementById("modal-is-available");
  const scheduleModalMessage = document.getElementById(
    "schedule-modal-message"
  );

  const messageModal = document.getElementById("message-modal");
  const modalText = document.getElementById("modal-text");
  const closeMessageModalBtn = document.getElementById("close-message-modal");

  let activeAppointmentId = null;
  let selectedFileBase64 = null;

  function showMessageModal(message) {
    modalText.textContent = message;
    modalBackdrop.classList.remove("hidden");
    messageModal.classList.remove("hidden");
  }

  function hideMessageModal() {
    modalBackdrop.classList.add("hidden");
    messageModal.classList.add("hidden");
  }

  function getDayName(dayNumber) {
    const days = {
      1: "Minggu",
      2: "Senin",
      3: "Selasa",
      4: "Rabu",
      5: "Kamis",
      6: "Jumat",
      7: "Sabtu",
    };

    const correctedDay = dayNumber == 0 ? 1 : dayNumber;

    return days[correctedDay] || "Tidak Diketahui";
  }

  function formatDate(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("id-ID", options);
  }

  function formatTime(timeString) {
    if (!timeString) return "N/A";
    const [hours, minutes] = timeString.split(":");
    return `${hours}:${minutes}`;
  }

  function getToken() {
    return localStorage.getItem("token");
  }

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/login";
  }

  function showPage(pageId, appointmentId = null) {
    document.querySelectorAll(".page-content").forEach((section) => {
      section.classList.add("hidden");
    });
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
    });

    if (pageId === "dashboard") {
      dashboardContent.classList.remove("hidden");
      navDashboard.classList.add("active");
      fetchDashboardData();
      navExamination.classList.add("hidden");
      activeAppointmentId = null;
    } else if (pageId === "profile") {
      profileContent.classList.remove("hidden");
      navProfile.classList.add("active");
      fetchDoctorProfile();
      navExamination.classList.add("hidden");
      activeAppointmentId = null;
    } else if (pageId === "examination" && appointmentId) {
      examinationContent.classList.remove("hidden");
      navExamination.classList.remove("hidden");
      navExamination.classList.add("active");
      activeAppointmentId = appointmentId;
      loadExaminationModule(appointmentId);
    }
  }

  navDashboard.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("dashboard");
  });

  navProfile.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("profile");
  });

  logoutBtn.addEventListener("click", logout);

  profilePicUploadInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        profilePicPreview.src = e.target.result;
        fotoProfilUrlInput.value = "";
        selectedFileBase64 = e.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      profilePicPreview.src =
        fotoProfilUrlInput.value ||
        "https://placehold.co/100x100/A0AEC0/FFFFFF?text=No+Pic";
      selectedFileBase64 = null;
    }
  });

  fotoProfilUrlInput.addEventListener("input", () => {
    profilePicUploadInput.value = null;
    selectedFileBase64 = null;
    profilePicPreview.src =
      fotoProfilUrlInput.value ||
      "https://placehold.co/100x100/A0AEC0/FFFFFF?text=No+Pic";
  });

  manageScheduleBtn.addEventListener("click", () => {
    modalIdSchedule.value = "";
    scheduleModalTitle.textContent = "Add New Schedule Entry";
    scheduleForm.reset();
    modalIsAvailable.value = "1";
    scheduleModalMessage.textContent = "";

    modalBackdrop.classList.remove("hidden");
    scheduleModal.classList.remove("hidden");
  });

  closeScheduleModalBtn.addEventListener("click", () => {
    modalBackdrop.classList.add("hidden");
    scheduleModal.classList.add("hidden");
  });

  closeMessageModalBtn.addEventListener("click", hideMessageModal);

  scheduleForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const dayNameToNumber = {
      Minggu: 1,
      Senin: 2,
      Selasa: 3,
      Rabu: 4,
      Kamis: 5,
      Jumat: 6,
      Sabtu: 7,
    };
    const selectedDayName = modalHariDalamMinggu.value;
    const hari_dalam_minggu = dayNameToNumber[selectedDayName];

    const id_schedule = modalIdSchedule.value
      ? parseInt(modalIdSchedule.value)
      : null;
    const waktu_mulai = modalWaktuMulai.value;
    const waktu_selesai = modalWaktuSelesai.value;
    const is_available = parseInt(modalIsAvailable.value);

    const payload = {
      id_schedule,
      hari_dalam_minggu,
      waktu_mulai,
      waktu_selesai,
      is_available: is_available === 1,
    };

    console.log("Sending this payload to the server:", payload);

    try {
      const response = await fetch(`${API_BASE_URL}/schedule`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (response.ok) {
        showMessageModal(data.message);
        closeScheduleModalBtn.click();
        fetchDashboardData();
      } else {
        scheduleModalMessage.textContent =
          data.message || "Failed to manage schedule.";
        scheduleModalMessage.classList.remove("text-green-500");
        scheduleModalMessage.classList.add("text-red-500");
      }
    } catch (error) {
      console.error("Schedule management request failed:", error);
      scheduleModalMessage.textContent = "Network error. Please try again.";
      scheduleModalMessage.classList.remove("text-green-500");
      scheduleModalMessage.classList.add("text-red-500");
    }
  });

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    let profilePicValue = fotoProfilUrlInput.value;
    if (selectedFileBase64) {
      profilePicValue = selectedFileBase64;
    }

    const profileData = {
      nama_lengkap: namaLengkapInput.value,
      email: emailInput.value,
      no_telepon: noTeleponInput.value,
      tanggal_lahir: tanggalLahirInput.value,
      jenis_kelamin: jenisKelaminSelect.value,
      nik: nikInput.value,
      alamat: alamatInput.value,
      spesialisasi: spesialisasiInput.value,
      lisensi_no: lisensiNoInput.value,
      pengalaman_tahun: parseInt(pengalamanTahunInput.value) || 0,
      foto_profil_url: profilePicValue,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/my-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      console.log("Profile update response data:", data);

      if (response.ok) {
        showMessageModal(data.message || "Profil berhasil diperbarui!");
        profileMessage.textContent = "";
        fetchDoctorProfile();
        selectedFileBase64 = null;
        profilePicUploadInput.value = null;
      } else {
        profileMessage.textContent =
          data.message || "Gagal memperbarui profil.";
        profileMessage.classList.remove("text-green-500");
        profileMessage.classList.add("text-red-500");
      }
    } catch (error) {
      console.error("Profile update failed:", error);
      if (error instanceof SyntaxError) {
        profileMessage.textContent =
          "Terjadi kesalahan dalam memproses respons server. Respons mungkin bukan JSON yang valid.";
      } else {
        profileMessage.textContent =
          "Terjadi kesalahan jaringan saat memperbarui profil. Silakan coba lagi.";
      }
      profileMessage.classList.remove("text-green-500");
      profileMessage.classList.add("text-red-500");
    }
  });

  examinationForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!activeAppointmentId || !currentPatientProfileIdInput.value) {
      examinationMessage.textContent =
        "No appointment selected for examination or patient ID is missing.";
      return;
    }

    const examinationData = {
      id_profile: parseInt(currentPatientProfileIdInput.value),
      chief_complaint: chiefComplaintInput.value,
      dental_examination_findings: dentalExaminationFindingsInput.value,
      diagnosis: diagnosisInput.value,
      treatment_plan: treatmentPlanInput.value,
      actions_taken: actionsTakenInput.value,
      doctor_notes: doctorNotesInput.value,
    };

    try {
      const response = await fetch(
        `${API_BASE_URL}/examination/${activeAppointmentId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(examinationData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        showMessageModal(data.message);
        showPage("dashboard");
      } else {
        examinationMessage.textContent =
          data.message || "Failed to save examination.";
      }
    } catch (error) {
      console.error("Save examination request failed:", error);
      examinationMessage.textContent = "Network error. Please try again.";
    }
  });

  function initializePage() {
    if (getToken()) {
      doctorPortal.classList.remove("hidden");
      showPage("dashboard");
    } else {
      console.log("No token found. Redirecting to login.");
      window.location.href = "/login";
    }
  }

  async function fetchDashboardData() {
    upcomingAppointmentsDiv.innerHTML =
      '<p class="text-gray-600 text-sm">Loading appointments...</p>';
    patientQueueDiv.innerHTML =
      '<p class="text-gray-600 text-sm">Loading queue...</p>';
    doctorScheduleDiv.innerHTML =
      '<p class="text-gray-600 text-sm">Loading schedule...</p>';

    try {
      const response = await fetch(`${API_BASE_URL}/dashboard-data`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.status === 401 || response.status === 403) {
        showMessageModal(
          "Session expired or unauthorized. Please log in again."
        );
        logout();
        return;
      }

      const data = await response.json();

      if (response.ok) {
        renderUpcomingAppointments(data.upcomingAppointments);
        renderPatientQueue(data.patientQueue);
        renderDoctorSchedule(data.doctorSchedule);
      } else {
        showMessageModal(data.message || "Failed to load dashboard data.");
      }
    } catch (error) {
      console.error("Error fetching dashboard:", error);
      showMessageModal("Network error loading dashboard data.");
    }
  }

  async function fetchDoctorProfile() {
    profileMessage.textContent = "";
    try {
      const response = await fetch(`${API_BASE_URL}/my-profile`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.status === 401 || response.status === 403) {
        showMessageModal(
          "Session expired or unauthorized. Please log in again."
        );
        logout();
        return;
      }

      const data = await response.json();

      if (response.ok) {
        const rating = parseFloat(data.rating_rata2);

        fotoProfilUrlInput.value = data.foto_profil_url || "";
        profilePicPreview.src =
          data.foto_profil_url ||
          "https://placehold.co/100x100/A0AEC0/FFFFFF?text=No+Pic";
        namaLengkapInput.value = data.nama_lengkap || "";
        emailInput.value = data.email || "";
        noTeleponInput.value = data.no_telepon || "";
        tanggalLahirInput.value = data.tanggal_lahir
          ? data.tanggal_lahir.split("T")[0]
          : ""; // Format for date input
        jenisKelaminSelect.value = data.jenis_kelamin || "";
        nikInput.value = data.nik || "";
        alamatInput.value = data.alamat || "";
        spesialisasiInput.value = data.spesialisasi || "";
        lisensiNoInput.value = data.lisensi_no || "";
        pengalamanTahunInput.value = data.pengalaman_tahun || "";
        ratingRata2P.textContent = isNaN(rating) ? "N/A" : rating.toFixed(1);

        profilePicPreview.onerror = () => {
          profilePicPreview.src =
            "https://placehold.co/100x100/A0AEC0/FFFFFF?text=No+Pic";
        };

        profilePicUploadInput.value = null;
        selectedFileBase64 = null;
      } else {
        showMessageModal(data.message || "Failed to load doctor profile.");
        showPage("dashboard"); // Go back to dashboard if profile fails to load
      }
    } catch (error) {
      console.error("Error fetching doctor profile:", error);
      showMessageModal("Network error loading doctor profile.");
      showPage("dashboard");
    }
  }

  function renderUpcomingAppointments(appointments) {
    upcomingAppointmentsDiv.innerHTML = "";
    if (appointments.length === 0) {
      upcomingAppointmentsDiv.innerHTML =
        '<p class="text-gray-600">No upcoming appointments.</p>';
      return;
    }
    appointments.forEach((appt) => {
      const apptElement = document.createElement("div");
      apptElement.classList.add(
        "bg-white",
        "p-3",
        "rounded-md",
        "shadow-sm",
        "cursor-pointer",
        "hover:bg-blue-100"
      );
      apptElement.innerHTML = `
                <p class="font-semibold text-gray-800">${appt.patient_name}</p>
                <p class="text-sm text-gray-600">${formatDate(
                  appt.tanggal_janji
                )} at ${formatTime(appt.waktu_janji)}</p>
                <p class="text-xs text-gray-500">Service: ${
                  appt.service_name || "N/A"
                }</p>
                <p class="text-xs text-gray-500">Reason: ${
                  appt.catatan_pasien || "N/A"
                }</p>
                <p class="text-xs text-gray-500">Status: <span class="font-medium">${
                  appt.status_janji
                }</span></p>
            `;
      apptElement.addEventListener("click", () =>
        showPage("examination", appt.id_appointment)
      );
      upcomingAppointmentsDiv.appendChild(apptElement);
    });
  }

  function renderPatientQueue(queue) {
    patientQueueDiv.innerHTML = "";
    if (queue.length === 0) {
      patientQueueDiv.innerHTML =
        '<p class="text-gray-600">No patients in queue today.</p>';
      return;
    }
    queue.forEach((patient) => {
      const queueElement = document.createElement("div");
      queueElement.classList.add(
        "bg-white",
        "p-3",
        "rounded-md",
        "shadow-sm",
        "cursor-pointer",
        "hover:bg-green-100"
      );
      queueElement.innerHTML = `
                <p class="font-semibold text-gray-800">${
                  patient.patient_name
                }</p>
                <p class="text-sm text-gray-600">Scheduled: ${formatTime(
                  patient.waktu_janji
                )}</p>
                <p class="text-xs text-gray-500">Service: ${
                  patient.service_name || "N/A"
                }</p>
                <p class="text-xs text-gray-500">Status: <span class="font-medium">${
                  patient.status_janji
                }</span></p>
            `;
      queueElement.addEventListener("click", () =>
        showPage("examination", patient.id_appointment)
      );
      patientQueueDiv.appendChild(queueElement);
    });
  }

  function renderDoctorSchedule(schedule) {
    doctorScheduleDiv.innerHTML = "";
    if (schedule.length === 0) {
      doctorScheduleDiv.innerHTML =
        '<p class="text-gray-600">No schedule available. Click "Manage Schedule" to add.</p>';
      return;
    }

    schedule.forEach((entry) => {
      const scheduleElement = document.createElement("div");
      scheduleElement.classList.add(
        "bg-white",
        "p-3",
        "rounded-md",
        "shadow-sm",
        "cursor-pointer",
        "hover:bg-purple-100"
      );
      const availabilityText = entry.is_available ? "Available" : "Unavailable";
      const availabilityColor = entry.is_available
        ? "text-green-600"
        : "text-red-600";
      scheduleElement.innerHTML = `
        <p class="font-semibold text-gray-800">${getDayName(
          entry.hari_dalam_minggu
        )}</p>
        <p class="text-sm text-gray-600">From ${formatTime(
          entry.waktu_mulai
        )} to ${formatTime(entry.waktu_selesai)}</p>
        <p class="text-xs ${availabilityColor}">Status: ${availabilityText}</p>
      `;
      scheduleElement.addEventListener("click", () => {
        modalIdSchedule.value = entry.id_schedule;
        scheduleModalTitle.textContent = "Edit Schedule Entry";
        modalHariDalamMinggu.value = getDayName(entry.hari_dalam_minggu);
        modalWaktuMulai.value = entry.waktu_mulai;
        modalWaktuSelesai.value = entry.waktu_selesai;
        modalIsAvailable.value = entry.is_available ? "1" : "0";
        scheduleModalMessage.textContent = "";

        modalBackdrop.classList.remove("hidden");
        scheduleModal.classList.remove("hidden");
      });
      doctorScheduleDiv.appendChild(scheduleElement);
    });
  }

  async function loadExaminationModule(appointmentId) {
    patientNamaLengkapSpan.textContent = "Loading...";
    patientTanggalLahirSpan.textContent = "";
    patientJenisKelaminSpan.textContent = "";
    patientNoTeleponSpan.textContent = "";
    patientEmailSpan.textContent = "";
    patientNikSpan.textContent = "";
    patientAlamatSpan.textContent = "";
    currentPatientProfileIdInput.value = "";
    medicalHistoryListDiv.innerHTML =
      '<p class="text-gray-600 text-sm">Loading medical history...</p>';

    examinationForm.reset();
    examinationMessage.textContent = "";

    try {
      const response = await fetch(
        `${API_BASE_URL}/appointment/${appointmentId}`,
        {
          headers: { Authorization: `Bearer ${getToken()}` },
        }
      );

      if (response.status === 401 || response.status === 403) {
        showMessageModal(
          "Session expired or unauthorized. Please log in again."
        );
        logout();
        return;
      }

      const data = await response.json();

      if (response.ok) {
        const { appointment, medicalHistory } = data;
        currentPatientProfileIdInput.value = appointment.id_profile;

        patientNamaLengkapSpan.textContent = appointment.patient_name;
        patientTanggalLahirSpan.textContent = appointment.tanggal_lahir
          ? formatDate(appointment.tanggal_lahir)
          : "N/A";
        patientJenisKelaminSpan.textContent =
          appointment.jenis_kelamin || "N/A";
        patientNoTeleponSpan.textContent = appointment.no_telepon || "N/A";
        patientEmailSpan.textContent = appointment.email || "N/A";
        patientNikSpan.textContent = appointment.nik || "N/A";
        patientAlamatSpan.textContent = appointment.alamat || "N/A";

        medicalHistoryListDiv.innerHTML = "";
        if (medicalHistory.length === 0) {
          medicalHistoryListDiv.innerHTML =
            '<p class="text-gray-600 text-sm">No previous medical history available.</p>';
        } else {
          medicalHistory.forEach((record) => {
            const recordElement = document.createElement("div");
            recordElement.classList.add(
              "bg-white",
              "p-3",
              "rounded-md",
              "shadow-sm",
              "border",
              "border-gray-200"
            );
            recordElement.innerHTML = `
                            <p class="font-semibold text-gray-800">Date: ${formatDate(
                              record.examination_date
                            )}</p>
                            <p class="text-sm text-gray-700">Examining Doctor: ${
                              record.examining_doctor_name || "N/A"
                            } (${record.service_name || "N/A"})</p>
                            <p class="text-sm text-gray-700">Chief Complaint: ${
                              record.chief_complaint || "N/A"
                            }</p>
                            <p class="text-sm text-gray-700">Diagnosis: ${
                              record.diagnosis || "N/A"
                            }</p>
                            <p class="text-sm text-gray-700">Treatment Plan: ${
                              record.treatment_plan || "N/A"
                            }</p>
                            <p class="text-sm text-gray-700">Actions Taken: ${
                              record.actions_taken || "N/A"
                            }</p>
                            <p class="text-xs text-gray-500 mt-1">Doctor Notes: ${
                              record.doctor_notes || "N/A"
                            }</p>
                        `;
            medicalHistoryListDiv.appendChild(recordElement);
          });
        }
      } else {
        showMessageModal(data.message || "Failed to load appointment details.");
        showPage("dashboard");
      }
    } catch (error) {
      console.error("Error fetching appointment details:", error);
      showMessageModal("Network error loading appointment details.");
      showPage("dashboard");
    }
  }

  initializePage();
});
