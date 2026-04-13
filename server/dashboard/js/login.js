const loginForm = document.getElementById("loginForm")
const message = document.getElementById("message")

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    const formData = new FormData(loginForm)
    const payload = Object.fromEntries(formData.entries())

    try{
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })

        const data = await res.json()

        if(!data.success){
            message.textContent = data.message || "Login failed"
            return
        }

        localStorage.setItem("token", data.data.token)
        localStorage.setItem("admin", JSON.stringify(data.data.admin))

        window.location.href = "/dashboard/index.html"
    }
    catch (error){
        message.textContent = "Something went wrong"
    }
})