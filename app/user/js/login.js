function loginUser() {
    const phone = document.getElementById("phone").value.trim();

    if (!phone) {
        alert("Telefon raqamni kiriting!");
        return;
    }

    localStorage.setItem("currentUser", phone);

    // Sahifaga o'tish
    window.location.href = "index.html";
}
