document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://localhost:3000/perawat";

  // --- DOM Elements ---
  const dashboardContent = document.getElementById("dashboard-content");
  const appointmentsContent = document.getElementById("appointments-content");
  const queueContent = document.getElementById("queue-content");
  const navDashboard = document.getElementById("nav-dashboard");
  const navAppointments = document.getElementById("nav-appointments");
  const navQueue = document.getElementById("nav-queue");
  const summaryTotal = document.getElementById("summary-total");
  const summaryCheckedIn = document.getElementById("summary-checked-in");
  const summaryPending = document.getElementById("summary-pending");
  const addAppointmentBtn = document.getElementById("add-appointment-btn");
  const appointmentsTableBody = document.getElementById(
    "appointments-table-body"
  );
  const modalBackdrop = document.getElementById("modal-backdrop");

  // Appointment Modal Elements
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

  // Filter Elements
  const filterDate = document.getElementById("filter-date");
  const filterDoctor = document.getElementById("filter-doctor");
  const filterStatus = document.getElementById("filter-status");

  // Queue Management Elements
  const todaysQueueContainer = document.getElementById(
    "todays-queue-container"
  );
  const queueModal = document.getElementById("queue-modal");
  const closeQueueModalBtn = document.getElementById("close-queue-modal-btn");
  const queueForm = document.getElementById("queue-form");
  const queueAppointmentId = document.getElementById("queue-appointment-id");
  const queueNumberInput = document.getElementById("queue-number");
  const queueStatusSelect = document.getElementById("queue-status");
  const logoutBtn = document.getElementById("logout-btn");

  // --- Utility Functions ---
  function getToken() {
    return localStorage.getItem("token");
  }
  function handleApiError(error) {
    console.error("API Error:", error);
    alert("Terjadi kesalahan: " + error.message);
  }

  // --- View Management ---
  function showPage(pageId) {
    [dashboardContent, appointmentsContent, queueContent].forEach((p) =>
      p.classList.add("hidden")
    );
    [navDashboard, navAppointments, navQueue].forEach((n) =>
      n.classList.remove("active")
    );

    if (pageId === "dashboard") {
      dashboardContent.classList.remove("hidden");
      navDashboard.classList.add("active");
      fetchDashboardSummary();
      fetchTodaysQueue();
    } else if (pageId === "appointments") {
      appointmentsContent.classList.remove("hidden");
      navAppointments.classList.add("active");
      fetchAllAppointments();
      fetchDoctorsForFilter();
    } else if (pageId === "queue") {
      queueContent.classList.remove("hidden");
      navQueue.classList.add("active");
      fetchTodaysQueue();
    }
  }

  // --- Modal Management ---
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

  function openQueueModal(appointment) {
    queueAppointmentId.value = appointment.id_appointment;
    queueNumberInput.value = appointment.nomor_antrian || "";
    queueStatusSelect.value = appointment.status_antrian || "Menunggu";
    modalBackdrop.classList.remove("hidden");
    queueModal.classList.remove("hidden");
  }
  function closeQueueModal() {
    modalBackdrop.classList.add("hidden");
    queueModal.classList.add("hidden");
    queueForm.reset();
  }

  // --- Data Fetching ---
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
    const params = new URLSearchParams();
    if (filterDate.value) params.append("date", filterDate.value);
    if (filterDoctor.value) params.append("doctor", filterDoctor.value);
    if (filterStatus.value) params.append("status", filterStatus.value);
    try {
      const response = await fetch(
        `${API_BASE_URL}/appointments?${params.toString()}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
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
        if (doctor.id_doctor == selectedDoctorId) option.selected = true;
        modalDoctor.appendChild(option);
      });
    } catch (error) {
      handleApiError(error);
    }
  }

  async function fetchDoctorsForFilter() {
    try {
      const response = await fetch(`${API_BASE_URL}/doctors`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Gagal memuat daftar dokter.");
      const doctors = await response.json();
      filterDoctor.innerHTML = '<option value="">Semua Dokter</option>';
      doctors.forEach((doctor) => {
        const option = document.createElement("option");
        option.value = doctor.id_doctor;
        option.textContent = doctor.nama_lengkap;
        filterDoctor.appendChild(option);
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
        if (service.id_service == selectedServiceId) option.selected = true;
        modalService.appendChild(option);
      });
    } catch (error) {
      handleApiError(error);
    }
  }

  async function fetchTodaysQueue() {
    todaysQueueContainer.innerHTML = `<p class="text-center text-gray-500">Memuat antrian pasien...</p>`;
    try {
      const response = await fetch(`${API_BASE_URL}/queue`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Gagal memuat antrian.");
      const queue = await response.json();
      renderTodaysQueue(queue);
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
      appointmentsTableBody.innerHTML = `<tr><td colspan="5" class="p-4 text-center">Tidak ada data janji temu yang cocok.</td></tr>`;
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

  function renderTodaysQueue(queue) {
    todaysQueueContainer.innerHTML = "";
    if (queue.length === 0) {
      todaysQueueContainer.innerHTML = `<p class="text-center text-gray-500">Tidak ada pasien dalam antrian hari ini.</p>`;
      return;
    }
    const queueGrid = document.createElement("div");
    queueGrid.className =
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4";
    queue.forEach((patient) => {
      const card = document.createElement("div");
      card.className =
        "p-4 border rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow";
      card.innerHTML = `
              <div class="flex justify-between items-center mb-2">
                  <p class="font-bold text-lg">${patient.patient_name}</p>
                  <p class="font-bold text-xl text-blue-600">#${
                    patient.nomor_antrian || "N/A"
                  }</p>
              </div>
              <p class="text-sm text-gray-600">Dokter: ${
                patient.doctor_name
              }</p>
              <p class="text-sm font-medium mt-2">Status: <span class="text-green-700">${
                patient.status_antrian || "Menunggu"
              }</span></p>
          `;
      card.addEventListener("click", () => openQueueModal(patient));
      queueGrid.appendChild(card);
    });
    todaysQueueContainer.appendChild(queueGrid);
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
  navQueue.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("queue");
  });
  addAppointmentBtn.addEventListener("click", () => {
    openModal("Tambah Janji Temu Baru");
  });
  closeModalBtn.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", closeModal);
  filterDate.addEventListener("change", fetchAllAppointments);
  filterDoctor.addEventListener("change", fetchAllAppointments);
  filterStatus.addEventListener("change", fetchAllAppointments);
  closeQueueModalBtn.addEventListener("click", closeQueueModal);
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  });

  queueForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = queueAppointmentId.value;
    const payload = {
      nomor_antrian: queueNumberInput.value,
      status_antrian: queueStatusSelect.value,
    };
    try {
      const response = await fetch(`${API_BASE_URL}/queue/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Gagal memperbarui status antrian.");
      }
      const result = await response.json();
      alert(result.message);
      closeQueueModal();
      fetchTodaysQueue();
    } catch (error) {
      handleApiError(error);
    }
  });

  appointmentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = modalAppointmentId.value;
    let payload, url, method;

    if (id) {
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
      fetchDashboardSummary(); // Also refresh summary in case status changed
    } catch (error) {
      handleApiError(error);
    }
  });

  // --- Initial Load ---
  function initializePage() {
    if (getToken()) {
      // Use a small timeout to ensure the DOM is fully ready before the first fetch
      setTimeout(() => {
        showPage("dashboard");
      }, 10);
    } else {
      window.location.href = "/login";
    }
  }

  initializePage();
});
