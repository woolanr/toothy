document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://localhost:3000/perawat";

  // --- DOM Elements ---
  const dashboardContent = document.getElementById("dashboard-content");
  const appointmentsContent = document.getElementById("appointments-content");
  const queueContent = document.getElementById("queue-content");
  const paymentsContent = document.getElementById("payments-content");
  const profileContent = document.getElementById("profile-content");

  const navDashboard = document.getElementById("nav-dashboard");
  const navAppointments = document.getElementById("nav-appointments");
  const navQueue = document.getElementById("nav-queue");
  const navPayments = document.getElementById("nav-payments");
  const navProfile = document.getElementById("nav-profile");

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

  // Payment Management Elements
  const paymentsTableBody = document.getElementById("payments-table-body");
  const paymentModal = document.getElementById("payment-modal");
  const closePaymentModalBtn = document.getElementById(
    "close-payment-modal-btn"
  );
  const paymentForm = document.getElementById("payment-form");
  const paymentAppointmentId = document.getElementById(
    "payment-appointment-id"
  );
  const paymentMethodSelect = document.getElementById("payment-method");
  const printReceiptBtn = document.getElementById("print-receipt-btn");
  const processPaymentBtn = document.getElementById("process-payment-btn");
  const receiptPatient = document.getElementById("receipt-patient");
  const receiptDoctor = document.getElementById("receipt-doctor");
  const receiptDate = document.getElementById("receipt-date");
  const receiptService = document.getElementById("receipt-service");
  const receiptTotal = document.getElementById("receipt-total");
  const receiptStatus = document.getElementById("receipt-status");

  // Profile Form Elements
  const profileForm = document.getElementById("profile-form");
  const profilePicPreview = document.getElementById("profile-pic-preview");
  const profileFotoUrlInput = document.getElementById("profile-foto-url");
  const profilePicUploadInput = document.getElementById("profile-pic-upload");
  const profileNamaLengkap = document.getElementById("profile-nama-lengkap");
  const profileEmail = document.getElementById("profile-email");
  const profileNoTelepon = document.getElementById("profile-no-telepon");
  const profileTanggalLahir = document.getElementById("profile-tanggal-lahir");
  const profileJenisKelamin = document.getElementById("profile-jenis-kelamin");
  const profileNik = document.getElementById("profile-nik");
  const profileAlamat = document.getElementById("profile-alamat");
  const profileMessage = document.getElementById("profile-message");

  const logoutBtn = document.getElementById("logout-btn");
  let selectedFileBase64 = null;

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
    [
      dashboardContent,
      appointmentsContent,
      queueContent,
      paymentsContent,
      profileContent,
    ].forEach((p) => p.classList.add("hidden"));
    [navDashboard, navAppointments, navQueue, navPayments, navProfile].forEach(
      (n) => n.classList.remove("active")
    );

    if (pageId === "dashboard") {
      dashboardContent.classList.remove("hidden");
      navDashboard.classList.add("active");
      fetchDashboardSummary();
    } else if (pageId === "queue") {
      queueContent.classList.remove("hidden");
      navQueue.classList.add("active");
      fetchTodaysQueue();
    } else if (pageId === "appointments") {
      appointmentsContent.classList.remove("hidden");
      navAppointments.classList.add("active");
      fetchAllAppointments();
      fetchDoctorsForFilter();
    } else if (pageId === "payments") {
      paymentsContent.classList.remove("hidden");
      navPayments.classList.add("active");
      fetchBillingList();
    } else if (pageId === "profile") {
      profileContent.classList.remove("hidden");
      navProfile.classList.add("active");
      fetchStaffProfile();
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

  function openPaymentModal(billingItem) {
    receiptPatient.textContent = billingItem.patient_name;
    receiptDoctor.textContent = billingItem.doctor_name;
    receiptDate.textContent = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    receiptService.textContent = billingItem.service_name;
    receiptTotal.textContent = `Rp ${Number(
      billingItem.service_cost
    ).toLocaleString("id-ID")}`;
    receiptStatus.textContent = billingItem.status_pembayaran || "Belum Lunas";
    paymentAppointmentId.value = billingItem.id_appointment;
    if (billingItem.status_pembayaran === "Lunas") {
      processPaymentBtn.classList.add("hidden");
      paymentMethodSelect.disabled = true;
    } else {
      processPaymentBtn.classList.remove("hidden");
      paymentMethodSelect.disabled = false;
    }
    modalBackdrop.classList.remove("hidden");
    paymentModal.classList.remove("hidden");
  }
  function closePaymentModal() {
    modalBackdrop.classList.add("hidden");
    paymentModal.classList.add("hidden");
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
  async function fetchBillingList() {
    paymentsTableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center">Memuat daftar tagihan...</td></tr>`;
    try {
      const response = await fetch(`${API_BASE_URL}/billing`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Gagal memuat daftar tagihan.");
      const billingList = await response.json();
      renderBillingTable(billingList);
    } catch (error) {
      handleApiError(error);
    }
  }
  async function fetchStaffProfile() {
    try {
      const response = await fetch(`${API_BASE_URL}/my-profile`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error("Gagal memuat profil.");
      const data = await response.json();

      profilePicPreview.src =
        data.foto_profil_url ||
        "https://placehold.co/100x100/A0AEC0/FFFFFF?text=No+Pic";
      profileFotoUrlInput.value = data.foto_profil_url || "";
      profilePicUploadInput.value = null;
      selectedFileBase64 = null;

      profileNamaLengkap.value = data.nama_lengkap || "";
      profileEmail.value = data.email || "";
      profileNoTelepon.value = data.no_telepon || "";
      profileTanggalLahir.value = data.tanggal_lahir
        ? data.tanggal_lahir.split("T")[0]
        : "";
      profileJenisKelamin.value = data.jenis_kelamin || "";
      profileNik.value = data.nik || "";
      profileAlamat.value = data.alamat || "";
    } catch (error) {
      handleApiError(error);
    }
  }

  // --- Rendering ---
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
  function renderBillingTable(billingList) {
    paymentsTableBody.innerHTML = "";
    if (billingList.length === 0) {
      paymentsTableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center">Tidak ada tagihan yang perlu diproses.</td></tr>`;
      return;
    }
    billingList.forEach((item) => {
      const row = document.createElement("tr");
      row.className = "border-b hover:bg-gray-50";
      const isPaid = item.status_pembayaran === "Lunas";
      row.innerHTML = `
              <td class="p-3">${item.patient_name}</td>
              <td class="p-3">${item.doctor_name}</td>
              <td class="p-3">${item.service_name}</td>
              <td class="p-3 font-medium">Rp ${Number(
                item.service_cost
              ).toLocaleString("id-ID")}</td>
              <td class="p-3"><span class="px-2 py-1 text-xs font-semibold rounded-full ${
                isPaid
                  ? "bg-green-200 text-green-800"
                  : "bg-red-200 text-red-800"
              }">${item.status_pembayaran || "Belum Lunas"}</span></td>
              <td class="p-3">
                  <button class="payment-btn text-blue-600 hover:text-blue-800 font-medium" data-id="${
                    item.id_appointment
                  }">${
        isPaid ? "Lihat Tanda Terima" : "Proses Pembayaran"
      }</button>
              </td>
          `;
      paymentsTableBody.appendChild(row);
      row.querySelector(".payment-btn").addEventListener("click", () => {
        const fullBillingItem = billingList.find(
          (b) => b.id_appointment == item.id_appointment
        );
        openPaymentModal(fullBillingItem);
      });
    });
  }

  // --- Event Listeners ---
  navDashboard.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("dashboard");
  });
  navQueue.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("queue");
  });
  navAppointments.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("appointments");
  });
  navPayments.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("payments");
  });
  navProfile.addEventListener("click", (e) => {
    e.preventDefault();
    showPage("profile");
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
  closePaymentModalBtn.addEventListener("click", closePaymentModal);
  printReceiptBtn.addEventListener("click", () => window.print());
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

  paymentForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      id_appointment: paymentAppointmentId.value,
      jumlah_pembayaran: document
        .getElementById("receipt-total")
        .textContent.replace(/[^0-9]/g, ""),
      metode_pembayaran: paymentMethodSelect.value,
    };
    try {
      const response = await fetch(`${API_BASE_URL}/payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Gagal memproses pembayaran.");
      }
      const result = await response.json();
      alert(result.message);
      closePaymentModal();
      fetchBillingList();
    } catch (error) {
      handleApiError(error);
    }
  });

  profilePicUploadInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        profilePicPreview.src = e.target.result;
        profileFotoUrlInput.value = "";
        selectedFileBase64 = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  profileFotoUrlInput.addEventListener("input", () => {
    profilePicUploadInput.value = null;
    selectedFileBase64 = null;
    profilePicPreview.src =
      profileFotoUrlInput.value ||
      "https://placehold.co/100x100/A0AEC0/FFFFFF?text=No+Pic";
  });

  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    let photoData = profileFotoUrlInput.value;
    if (selectedFileBase64) {
      photoData = selectedFileBase64;
    }

    const payload = {
      nama_lengkap: profileNamaLengkap.value,
      email: profileEmail.value,
      no_telepon: profileNoTelepon.value,
      tanggal_lahir: profileTanggalLahir.value,
      jenis_kelamin: profileJenisKelamin.value,
      nik: profileNik.value,
      alamat: profileAlamat.value,
      foto_profil_url: photoData,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/my-profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Gagal menyimpan profil.");

      profileMessage.textContent = result.message;
      profileMessage.className = "text-sm text-center text-green-600";
      fetchStaffProfile();
      setTimeout(() => (profileMessage.textContent = ""), 3000);
    } catch (error) {
      profileMessage.textContent = error.message;
      profileMessage.className = "text-sm text-center text-red-600";
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
      fetchDashboardSummary();
    } catch (error) {
      handleApiError(error);
    }
  });

  // --- Initial Load ---
  function initializePage() {
    if (getToken()) {
      setTimeout(() => {
        showPage("dashboard");
      }, 10);
    } else {
      window.location.href = "/login";
    }
  }
  initializePage();
});
