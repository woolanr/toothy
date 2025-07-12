document.addEventListener("DOMContentLoaded", () => {
  // === FINAL DEBUGGING CHECK ===
  console.log("DOM Content Loaded. Memulai script...");
  const checkTimeSlots = document.getElementById("time-slots-container");
  console.log("Mencari #time-slots-container:", checkTimeSlots);
  if (!checkTimeSlots) {
    console.error(
      "KRITIS: Elemen #time-slots-container TIDAK DITEMUKAN. Periksa ID di file .ejs Anda."
    );
  }
  // ============================

  const API_BASE_URL = "http://localhost:3000/pasien";

  // --- Elemen Konten Halaman ---
  const allPages = {
    dashboard: document.getElementById("dashboard-content"),
    booking: document.getElementById("booking-content"),
    history: document.getElementById("history-content"),
    profile: document.getElementById("profile-content"),
  };

  // --- Link Navigasi ---
  const navLinks = {
    dashboard: document.getElementById("nav-dashboard"),
    booking: document.getElementById("nav-booking"),
    history: document.getElementById("nav-history"),
    profile: document.getElementById("nav-profile"),
  };
  const logoutBtn = document.getElementById("logout-btn");

  // --- Elemen Dasbor ---
  const patientNameGreeting = document.getElementById("patient-name-greeting");
  const upcomingAppointmentCard = document.getElementById(
    "upcoming-appointment-card"
  );

  // --- Elemen Booking ---
  const bookingForm = document.getElementById("booking-form");
  const serviceSelect = document.getElementById("service-select");
  const doctorSelect = document.getElementById("doctor-select");
  const appointmentDate = document.getElementById("appointment-date");
  const timeSlotsContainer = document.getElementById("time-slots-container");
  const selectedTimeInput = document.getElementById("selected-time");
  const bookingMessage = document.getElementById("booking-message");

  // --- Elemen Riwayat ---
  const historyTableBody = document.getElementById("history-table-body");

  // --- Fungsi Utilitas ---
  const getToken = () => localStorage.getItem("token");
  const formatDate = (dateStr) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "N/A";
  const formatTime = (timeStr) => (timeStr ? timeStr.substring(0, 5) : "N/A");

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
        break; // TODO
    }
  }

  // --- Logika API ---
  async function fetchApi(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
        ...options.headers,
      },
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
    bookingMessage.textContent = "Memproses...";
    bookingMessage.className = "text-gray-600";

    const formData = {
      id_service: serviceSelect.value,
      id_doctor: doctorSelect.value,
      tanggal_janji: appointmentDate.value,
      waktu_janji: selectedTimeInput.value,
      keluhan: document.getElementById("complaint").value,
    };

    if (!formData.waktu_janji) {
      bookingMessage.textContent = "Harap pilih waktu janji temu.";
      bookingMessage.className = "text-red-600";
      return;
    }

    try {
      const result = await fetchApi("/appointments", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      bookingMessage.textContent = result.message;
      bookingMessage.className = "text-green-600";
      bookingForm.reset();
      timeSlotsContainer.innerHTML =
        '<p class="col-span-full text-sm text-gray-500">Pilih dokter dan tanggal terlebih dahulu.</p>';
      setTimeout(() => showPage("dashboard"), 2000);
    } catch (error) {
      bookingMessage.textContent = error.message;
      bookingMessage.className = "text-red-600";
    }
  }

  // --- Logika Riwayat ---
  async function fetchHistoryData() {
    if (!historyTableBody) return;
    historyTableBody.innerHTML =
      '<tr><td colspan="4" class="text-center py-4 text-gray-500">Memuat riwayat...</td></tr>';
    try {
      const history = await fetchApi("/appointments/history");
      if (history.length === 0) {
        historyTableBody.innerHTML =
          '<tr><td colspan="4" class="text-center py-4 text-gray-500">Tidak ada riwayat kunjungan ditemukan.</td></tr>';
        return;
      }
      historyTableBody.innerHTML = "";
      history.forEach((app) => {
        const row = historyTableBody.insertRow();
        row.className = "border-b border-gray-200 hover:bg-gray-50";
        const statusColor =
          app.status_janji === "Completed"
            ? "text-green-600"
            : app.status_janji === "Canceled"
            ? "text-red-600"
            : "text-gray-700";
        row.innerHTML = `
                <td class="py-3 px-4">${formatDate(
                  app.tanggal_janji
                )} - ${formatTime(app.waktu_janji)}</td>
                <td class="py-3 px-4">${app.doctor_name}</td>
                <td class="py-3 px-4">${app.nama_layanan}</td>
                <td class="py-3 px-4 font-semibold ${statusColor}">${
          app.status_janji
        }</td>
            `;
      });
    } catch (error) {
      historyTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">${error.message}</td></tr>`;
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

  if (logoutBtn)
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("token");
      window.location.href = "/login.html";
    });

  if (bookingForm) bookingForm.addEventListener("submit", handleBookingSubmit);
  if (doctorSelect) doctorSelect.addEventListener("change", fetchAvailability);
  if (appointmentDate)
    appointmentDate.addEventListener("change", fetchAvailability);

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
  } else {
    console.error(
      "Event listener untuk timeSlotsContainer tidak bisa dipasang karena elemennya null."
    );
  }

  // --- Inisialisasi ---
  if (!getToken()) {
    window.location.href = "/login.html";
  } else {
    showPage("dashboard");
  }
});
