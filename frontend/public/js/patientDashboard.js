document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "http://localhost:3000/pasien";

  // --- Elemen-elemen ---
  const allPages = {
    dashboard: document.getElementById("dashboard-content"),
    booking: document.getElementById("booking-content"),
    history: document.getElementById("history-content"),
    profile: document.getElementById("profile-content"),
  };
  const navLinks = {
    dashboard: document.getElementById("nav-dashboard"),
    booking: document.getElementById("nav-booking"),
    history: document.getElementById("nav-history"),
    profile: document.getElementById("nav-profile"),
  };
  const logoutBtn = document.getElementById("logout-btn");
  const patientNameGreeting = document.getElementById("patient-name-greeting");
  const upcomingAppointmentCard = document.getElementById(
    "upcoming-appointment-card"
  );
  const bookingForm = document.getElementById("booking-form");
  const serviceSelect = document.getElementById("service-select");
  const doctorSelect = document.getElementById("doctor-select");
  const appointmentDate = document.getElementById("appointment-date");
  const timeSlotsContainer = document.getElementById("time-slots-container");
  const selectedTimeInput = document.getElementById("selected-time");
  const bookingMessage = document.getElementById("booking-message");
  const historyTableBody = document.getElementById("history-table-body");
  const profileForm = document.getElementById("profile-form");
  const profileImageDisplay = document.getElementById("profile-image-display");
  const profilePhotoInput = document.getElementById("profile-photo-input");
  const changePhotoBtn = document.getElementById("change-photo-btn");

  // --- Fungsi Utilitas ---
  const getToken = () => localStorage.getItem("token");
  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";
  const formatTime = (timeStr) => (timeStr ? timeStr.substring(0, 5) : "N/A");

  // --- Fungsi Notifikasi Pop-up (Toast) ---
  function showToast(message, type = "info") {
    let toastContainer = document.getElementById("toast-container");
    if (!toastContainer) {
      toastContainer = document.createElement("div");
      toastContainer.id = "toast-container";
      toastContainer.className = "toast-container";
      document.body.appendChild(toastContainer);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    const iconClass =
      type === "success"
        ? "fa-check-circle"
        : type === "error"
        ? "fa-times-circle"
        : "fa-info-circle";
    toast.innerHTML = `<i class="fas ${iconClass} toast-icon"></i><span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add("show"), 100);
    setTimeout(() => {
      toast.classList.remove("show");
      toast.addEventListener("transitionend", () => toast.remove());
    }, 3000);
  }

  // --- Manajemen Tampilan ---
  function showPage(pageId) {
    Object.values(allPages).forEach(
      (page) => page && page.classList.add("hidden")
    );
    Object.values(navLinks).forEach(
      (link) => link && link.classList.remove("active")
    );
    if (allPages[pageId]) allPages[pageId].classList.remove("hidden");
    if (navLinks[pageId]) navLinks[pageId].classList.add("active");

    switch (pageId) {
      case "dashboard":
        fetchDashboardData();
        break;
      case "booking":
        initializeBookingPage();
        break;
      case "history":
        fetchHistoryData();
        break;
      case "profile":
        fetchProfileData();
        break;
    }
  }

  // --- Logika API ---
  async function fetchApi(endpoint, options = {}) {
    const isFormData = options.body instanceof FormData;
    const headers = {
      Authorization: `Bearer ${getToken()}`,
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    };
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.message || `Error ${response.status}`);
    return data;
  }

  // --- Logika Dasbor ---
  async function fetchDashboardData() {
    try {
      const data = await fetchApi("/dashboard-data");
      if (patientNameGreeting)
        patientNameGreeting.textContent = data.patientName || "Pasien";
      if (upcomingAppointmentCard) {
        if (data.upcomingAppointment) {
          const appt = data.upcomingAppointment;
          upcomingAppointmentCard.innerHTML = `
            <p class="text-gray-600">Anda memiliki janji temu pada:</p>
            <p class="text-2xl font-bold text-blue-600 mt-2">${formatDate(
              appt.tanggal_janji
            )}</p>
            <p class="text-lg text-gray-800">Pukul ${formatTime(
              appt.waktu_janji
            )} WIB</p>
            <div class="mt-4 pt-4 border-t">
                <p><strong>Dokter:</strong> ${appt.doctor_name}</p>
                <p><strong>Layanan:</strong> ${appt.service_name}</p>
                <p><strong>Status:</strong> <span class="font-semibold text-green-600">${
                  appt.status_janji
                }</span></p>
            </div>`;
        } else {
          upcomingAppointmentCard.innerHTML = `<p class="text-gray-500">Anda tidak memiliki janji temu yang akan datang.</p>`;
        }
      }
    } catch (error) {
      console.error("Dashboard Error:", error);
      if (upcomingAppointmentCard)
        upcomingAppointmentCard.innerHTML = `<p class="text-red-500">${error.message}</p>`;
    }
  }

  // --- Logika Booking ---
  async function initializeBookingPage() {
    try {
      const { services, doctors } = await fetchApi("/booking-data");
      serviceSelect.innerHTML = '<option value="">-- Pilih Layanan --</option>';
      services.forEach((s) =>
        serviceSelect.add(
          new Option(
            `${s.nama_layanan} (Rp ${Number(s.harga).toLocaleString("id-ID")})`,
            s.id_service
          )
        )
      );
      doctorSelect.innerHTML = '<option value="">-- Pilih Dokter --</option>';
      doctors.forEach((d) =>
        doctorSelect.add(new Option(d.nama_lengkap, d.id_doctor))
      );
    } catch (error) {
      console.error("Booking Init Error:", error);
    }
  }
  async function fetchAvailability() {
    const id_doctor = doctorSelect.value;
    const tanggal_janji = appointmentDate.value;
    if (!id_doctor || !tanggal_janji) {
      timeSlotsContainer.innerHTML =
        '<p class="col-span-full text-sm text-gray-500">Pilih dokter dan tanggal terlebih dahulu.</p>';
      return;
    }
    timeSlotsContainer.innerHTML =
      '<p class="col-span-full text-sm text-gray-500">Mencari jadwal...</p>';
    try {
      const availableSlots = await fetchApi(
        `/availability?id_doctor=${id_doctor}&tanggal_janji=${tanggal_janji}`
      );
      renderAvailability(availableSlots);
    } catch (error) {
      console.error("Availability Error:", error);
      timeSlotsContainer.innerHTML = `<p class="col-span-full text-sm text-red-500">${error.message}</p>`;
    }
  }
  function renderAvailability(slots) {
    if (!timeSlotsContainer) return;
    timeSlotsContainer.innerHTML = "";
    selectedTimeInput.value = "";
    if (slots.length === 0) {
      timeSlotsContainer.innerHTML =
        '<p class="col-span-full text-sm text-gray-500">Tidak ada jadwal tersedia pada tanggal ini.</p>';
      return;
    }
    slots.forEach((slot) => {
      const slotEl = document.createElement("div");
      slotEl.className = "time-slot";
      slotEl.textContent = formatTime(slot);
      slotEl.dataset.time = slot;
      timeSlotsContainer.appendChild(slotEl);
    });
  }
  async function handleBookingSubmit(e) {
    e.preventDefault();
    const formData = {
      id_service: serviceSelect.value,
      id_doctor: doctorSelect.value,
      tanggal_janji: appointmentDate.value,
      waktu_janji: selectedTimeInput.value,
      keluhan: document.getElementById("complaint").value,
    };
    if (!formData.waktu_janji) {
      showToast("Harap pilih waktu janji temu.", "error");
      return;
    }
    try {
      const result = await fetchApi("/appointments", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      showToast(result.message, "success");
      bookingForm.reset();
      timeSlotsContainer.innerHTML =
        '<p class="col-span-full text-sm text-gray-500">Pilih dokter dan tanggal terlebih dahulu.</p>';
      setTimeout(() => showPage("dashboard"), 2000);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  // --- Logika Riwayat ---
  async function fetchHistoryData() {
    if (!historyTableBody) return;
    historyTableBody.innerHTML =
      '<tr><td colspan="5" class="text-center py-4 text-gray-500">Memuat riwayat...</td></tr>';
    try {
      const history = await fetchApi("/appointments/history");
      renderHistory(history);
    } catch (error) {
      historyTableBody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
    }
  }

  function renderHistory(appointments) {
    if (!historyTableBody) return;
    if (appointments.length === 0) {
      historyTableBody.innerHTML =
        '<tr><td colspan="5" class="text-center py-4 text-gray-500">Tidak ada riwayat kunjungan ditemukan.</td></tr>';
      return;
    }

    historyTableBody.innerHTML = "";
    appointments.forEach((app, index) => {
      const row = historyTableBody.insertRow();
      row.className = "border-b border-gray-200 hover:bg-gray-50";
      const statusColor =
        app.status_janji === "Completed" ? "text-green-600" : "text-red-600";
      const hasMedicalRecord =
        app.diagnosis ||
        app.treatment_plan ||
        app.actions_taken ||
        app.doctor_notes ||
        app.resep_obat;
      row.innerHTML = `
            <td class="py-3 px-4">${formatDate(
              app.tanggal_janji
            )} - ${formatTime(app.waktu_janji)}</td>
            <td class="py-3 px-4">${app.doctor_name}</td>
            <td class="py-3 px-4">${app.nama_layanan}</td>
            <td class="py-3 px-4 font-semibold ${statusColor}">${
        app.status_janji
      }</td>
            <td class="py-3 px-4">
                ${
                  hasMedicalRecord
                    ? `<button data-index="${index}" class="view-details-btn text-blue-600 hover:underline">Lihat Detail</button>`
                    : "<span>-</span>"
                }
            </td>
        `;
      if (hasMedicalRecord) {
        const detailRow = historyTableBody.insertRow();
        detailRow.id = `detail-row-${index}`;
        detailRow.className = "hidden detail-row";
        detailRow.innerHTML = `
                <td colspan="5" class="p-4">
                    <div class="p-4 bg-gray-100 rounded-md space-y-2">
                        <h4 class="font-bold text-md mb-2">Detail Rekam Medis</h4>
                        <p><strong>Diagnosis:</strong> ${
                          app.diagnosis || "Tidak ada data"
                        }</p>
                        <p><strong>Rencana Perawatan:</strong> ${
                          app.treatment_plan || "Tidak ada data"
                        }</p>
                        <p><strong>Tindakan yang Dilakukan:</strong> ${
                          app.actions_taken || "Tidak ada data"
                        }</p>
                        <p><strong>Catatan Dokter:</strong> ${
                          app.doctor_notes || "Tidak ada data"
                        }</p>
                        <p><strong>Resep Obat:</strong> ${
                          app.resep_obat || "Tidak ada data"
                        }</p>
                    </div>
                </td>
            `;
      }
    });
  }

  // --- Logika Profil ---
  async function fetchProfileData() {
    try {
      const profile = await fetchApi("/profile");
      renderProfile(profile);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function renderProfile(profile) {
    if (!profileForm) return;
    if (profile.foto_profil_url) {
      profileImageDisplay.src = profile.foto_profil_url;
    } else {
      profileImageDisplay.src =
        "https://placehold.co/128x128/e0e0e0/757575?text=Foto";
    }
    document.getElementById("profile-nama").value = profile.nama_lengkap || "";
    document.getElementById("profile-email").value = profile.email || "";
    document.getElementById("profile-tanggal-lahir").value =
      profile.tanggal_lahir
        ? new Date(profile.tanggal_lahir).toISOString().split("T")[0]
        : "";
    document.getElementById("profile-jenis-kelamin").value =
      profile.jenis_kelamin || "";
    document.getElementById("profile-nik").value = profile.nik || "";
    document.getElementById("profile-no-telepon").value =
      profile.no_telepon || "";
    document.getElementById("profile-alamat").value = profile.alamat || "";
    document.getElementById("profile-suhu-tubuh").value =
      profile.suhu_tubuh || "";
    document.getElementById("profile-golongan-darah").value =
      profile.golongan_darah || "";
    document.getElementById("profile-alergi").value = profile.alergi || "";
  }

  async function handleProfileUpdate(e) {
    e.preventDefault();
    const formData = {
      nama_lengkap: document.getElementById("profile-nama").value,
      email: document.getElementById("profile-email").value,
      tanggal_lahir: document.getElementById("profile-tanggal-lahir").value,
      jenis_kelamin: document.getElementById("profile-jenis-kelamin").value,
      nik: document.getElementById("profile-nik").value,
      no_telepon: document.getElementById("profile-no-telepon").value,
      alamat: document.getElementById("profile-alamat").value,
      suhu_tubuh: document.getElementById("profile-suhu-tubuh").value,
      golongan_darah: document.getElementById("profile-golongan-darah").value,
      alergi: document.getElementById("profile-alergi").value,
    };
    try {
      const result = await fetchApi("/profile", {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      showToast(result.message, "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    showToast("Mengupload foto...", "info");
    const formData = new FormData();
    formData.append("profilePhoto", file);
    try {
      const result = await fetchApi("/profile/photo", {
        method: "POST",
        body: formData,
      });
      showToast(result.message, "success");
      if (result.filePath) {
        profileImageDisplay.src = result.filePath;
      }
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  // --- Event Listeners ---
  Object.keys(navLinks).forEach((key) => {
    if (navLinks[key])
      navLinks[key].addEventListener("click", (e) => {
        e.preventDefault();
        showPage(key);
      });
  });
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      // PERBAIKAN: Mengarahkan ke rute /login, bukan file .html
      window.location.href = "/login";
    });
  }
  if (bookingForm) bookingForm.addEventListener("submit", handleBookingSubmit);
  if (doctorSelect) doctorSelect.addEventListener("change", fetchAvailability);
  if (appointmentDate)
    appointmentDate.addEventListener("change", fetchAvailability);
  if (historyTableBody) {
    historyTableBody.addEventListener("click", (event) => {
      if (event.target && event.target.classList.contains("view-details-btn")) {
        const index = event.target.dataset.index;
        const detailRow = document.getElementById(`detail-row-${index}`);
        if (detailRow) {
          detailRow.classList.toggle("hidden");
        }
      }
    });
  }
  if (timeSlotsContainer) {
    timeSlotsContainer.addEventListener("click", (event) => {
      const clickedSlot = event.target.closest(".time-slot");
      if (!clickedSlot) return;
      timeSlotsContainer
        .querySelectorAll(".time-slot")
        .forEach((el) => el.classList.remove("selected"));
      clickedSlot.classList.add("selected");
      selectedTimeInput.value = clickedSlot.dataset.time;
    });
  }
  if (profileForm) profileForm.addEventListener("submit", handleProfileUpdate);
  if (changePhotoBtn)
    changePhotoBtn.addEventListener("click", () => profilePhotoInput.click());
  if (profilePhotoInput)
    profilePhotoInput.addEventListener("change", handlePhotoUpload);

  // --- Inisialisasi ---
  if (!getToken()) {
    window.location.href = "/login";
  } else {
    showPage("dashboard");
  }
});
