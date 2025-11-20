function registerUser() {
    const phone = document.getElementById("phone").value.trim();

    if (!phone) {
        alert("Telefon raqamni kiriting!");
        return;
    }

    localStorage.setItem("newUser", phone);

    // Keyingi qadam — role tanlash yoki profil to‘ldirish
    window.location.href = "profile.html";
}
