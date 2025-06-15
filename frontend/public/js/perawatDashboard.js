document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://localhost:3000/perawat";

  // DOM Elements
  const dashboardContent = document.getElementById("dashboard-content");
  const appointmentsContent = document.getElementById("appointments-content");
  const navDashboard = document.getElementById("nav-dashboard");
  const navAppointments = document.getElementById("nav-appointments");
  const summaryTotal = document.getElementById("summary-total");
  const summaryCheckedIn = document.getElementById("summary-checked-in");
  const summaryPending = document.getElementById("summary-pending");
  const addAppointmentBtn = document.getElementById("add-appointment-btn");
  const appointmentsTableBody = document.getElementById(
    "appointments-table-body"
  );
  const modalBackdrop = document.getElementById("modal-backdrop");
  const appointmentModal = document.getElementById("appointment-modal");
  const modalTitle = document.getElementById("modal-title");
  const closeModalBtn = document.getElementById("close-modal-btn");
  const appointmentForm = document.getElementById("appointment-form");
  const modalAppointmentId = document.getElementById("modal-appointment-id");
  const modalPatientName = document.getElementById("modal-patient-name");
  const modalDoctor = document.getElementById("modal-doctor");
  const modalService = document.getElementById("modal-service");
  const modalDate = document.getElementById("modal-date");
  const modalTime = document.getElementById("modal-time");
  const modalStatus = document.getElementById("modal-status");
  const modalNotes = document.getElementById("modal-notes");

  // Utility Functions
  function getToken() {
    return localStorage.getItem("token");
  }

  function handleApiError(error) {
    console.error("API Error:", error);
    alert("Terjadi kesalahan: " + error.message);
  }

  // View Management
  function showPage(pageId) {
    [dashboardContent, appointmentsContent].forEach((p) =>
      p.classList.add("hidden")
    );
    [navDashboard, navAppointments].forEach((n) =>
      n.classList.remove("active")
    );

    if (pageId === "dashboard") {
      dashboardContent.classList.remove("hidden");
      navDashboard.classList.add("active");
      fetchDashboardSummary();
    } else if (pageId === "appointments") {
      appointmentsContent.classList.remove("hidden");
      navAppointments.classList.add("active");
      fetchAllAppointments();
    }
  }

  // Modal Management
  async function openModal(title, appointment = {}) {
    modalTitle.textContent = title;

    await Promise.all([
      fetchDoctorsForModal(appointment.id_doctor),
      fetchServicesForModal(appointment.id_service),
    ]);

    modalAppointmentId.value = appointment.id_appointment || "";
    modalPatientName.value = appointment.patient_name || "";
    modalPatientName.readOnly = !!appointment.id_appointment;

    modalDate.value = appointment.tanggal_janji
      ? appointment.tanggal_janji.split("T")[0]
      : new Date().toISOString().split("T")[0];
    modalTime.value = appointment.waktu_janji
      ? appointment.waktu_janji.substring(0, 5)
      : "09:00";
    modalStatus.value = appointment.status_janji || "Pending";
    modalNotes.value = appointment.catatan_pasien || "";

    modalBackdrop.classList.remove("hidden");
    appointmentModal.classList.remove("hidden");
  }

  function closeModal() {
    modalBackdrop.classList.add("hidden");
    appointmentModal.classList.add("hidden");
    appointmentForm.reset();
  }

  // Data Fetching
  async function fetchDashboardSummary() {
    try {
      const response = await fetch(`${API_BASE_URL}/summary`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Gagal memuat data ringkasan.");
      const data = await response.json();
      summaryTotal.textContent = data.total;
      summaryCheckedIn.textContent = data.checkedIn;
      summaryPending.textContent = data.pending;
    } catch (error) {
      handleApiError(error);
    }
  }

  async function fetchAllAppointments() {
    appointmentsTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center">Memuat data janji temu...</td></tr>`;
    try {
      const response = await fetch(`${API_BASE_URL}/appointments`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Gagal memuat daftar janji temu.");
      const appointments = await response.json();
      renderAppointmentsTable(appointments);
    } catch (error) {
      handleApiError(error);
    }
  }

  async function fetchDoctorsForModal(selectedDoctorId) {
    try {
      const response = await fetch(`${API_BASE_URL}/doctors`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Gagal memuat daftar dokter.");
      const doctors = await response.json();

      modalDoctor.innerHTML = '<option value="">Pilih Dokter</option>';
      doctors.forEach((doctor) => {
        const option = document.createElement("option");
        option.value = doctor.id_doctor;
        option.textContent = doctor.nama_lengkap;
        if (doctor.id_doctor == selectedDoctorId) {
          option.selected = true;
        }
        modalDoctor.appendChild(option);
      });
    } catch (error) {
      handleApiError(error);
    }
  }

  async function fetchServicesForModal(selectedServiceId) {
    try {
      const response = await fetch(`${API_BASE_URL}/services`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Gagal memuat daftar layanan.");
      const services = await response.json();

      modalService.innerHTML = '<option value="">Pilih Layanan</option>';
      services.forEach((service) => {
        const option = document.createElement("option");
        option.value = service.id_service;
        option.textContent = service.nama_layanan;
        if (service.id_service == selectedServiceId) {
          option.selected = true;
        }
        modalService.appendChild(option);
      });
    } catch (error) {
      handleApiError(error);
    }
  }

  // Rendering
  function getStatusBadge(status) {
    const colors = {
      Pending: "bg-yellow-200 text-yellow-800",
      Confirmed: "bg-blue-200 text-blue-800",
      Completed: "bg-green-200 text-green-800",
      Cancelled: "bg-red-200 text-red-800",
      Rescheduled: "bg-purple-200 text-purple-800",
    };
    const colorClass = colors[status] || "bg-gray-200 text-gray-800";
    return `<span class="px-2 py-1 text-xs font-semibold rounded-full ${colorClass}">${status}</span>`;
  }

  function renderAppointmentsTable(appointments) {
    appointmentsTableBody.innerHTML = "";
    if (appointments.length === 0) {
      appointmentsTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center">Tidak ada data janji temu.</td></tr>`;
      return;
    }
    appointments.forEach((appt) => {
      const row = document.createElement("tr");
      row.className = "border-b hover:bg-gray-50";
      row.innerHTML = `
            <td class="p-3">${appt.patient_name}</td>
            <td class="p-3">${appt.doctor_name}</td>
            <td class="p-3">${new Date(appt.tanggal_janji).toLocaleDateString(
              "id-ID",
              { day: "2-digit", month: "long", year: "numeric" }
            )} - ${appt.waktu_janji.substring(0, 5)}</td>
            <td class="p-3">${getStatusBadge(appt.status_janji)}</td>
            <td class="p-3"><button class="edit-btn text-blue-600 hover:text-blue-800 font-medium" data-id="${
              appt.id_appointment
            }">Detail</button></td>
        `;
      appointmentsTableBody.appendChild(row);
      row.querySelector(".edit-btn").addEventListener("click", (e) => {
        const appointmentId = e.target.getAttribute("data-id");
        const appointmentData = appointments.find(
          (a) => a.id_appointment == appointmentId
        );
        openModal("Detail Janji Temu", appointmentData);
      });
    });
  }

  // Event Listeners
  navDashboard.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("dashboard");
  });
  navAppointments.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("appointments");
  });
  addAppointmentBtn.addEventListener("click", () => {
    openModal("Tambah Janji Temu Baru");
  });
  closeModalBtn.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);

  appointmentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = modalAppointmentId.value;

    let payload;
    let url;
    let method;

    if (id) {
      // UPDATE
      method = "PUT";
      url = `${API_BASE_URL}/appointment/${id}`;
      payload = {
        id_doctor: modalDoctor.value,
        id_service: modalService.value,
        tanggal_janji: modalDate.value,
        waktu_janji: modalTime.value,
        status_janji: modalStatus.value,
        catatan_pasien: modalNotes.value,
      };
    } else {
      // CREATE
      method = "POST";
      url = `${API_BASE_URL}/appointment`;
      payload = {
        patient_name: modalPatientName.value,
        id_doctor: modalDoctor.value,
        id_service: modalService.value,
        tanggal_janji: modalDate.value,
        waktu_janji: modalTime.value,
        status_janji: modalStatus.value,
        catatan_pasien: modalNotes.value,
      };
    }

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Gagal menyimpan janji temu.");
      }

      const result = await response.json();
      alert(result.message);
      closeModal();
      fetchAllAppointments();
    } catch (error) {
      handleApiError(error);
    }
  });

  // Initial Load
  showPage("dashboard");
});
