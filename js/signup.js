// Cambia de formulario de registro según el rol seleccionado y actualiza los estilos de los botones

const userRoleBtn = document.querySelector("#user-role-btn");
const ownerRoleBtn = document.querySelector("#owner-role-btn");
const userForm = document.querySelector(".signup-form-user");
const ownerForm = document.querySelector(".signup-form-owner");

function showForm(role) {
    const isUser = role === "user";

    userForm.hidden = !isUser;
    ownerForm.hidden = isUser;
    userRoleBtn.classList.toggle("signup-switch-role-active", isUser);
    userRoleBtn.classList.toggle("signup-switch-role-inactive", !isUser);
    ownerRoleBtn.classList.toggle("signup-switch-role-active", !isUser);
    ownerRoleBtn.classList.toggle("signup-switch-role-inactive", isUser);
}

userRoleBtn.addEventListener("click", () => showForm("user"));
ownerRoleBtn.addEventListener("click", () => showForm("owner"));