requireAuth()

async function loadOverview(){
    try{
        const [usersRes, qrRes, analyticsRes] = await Promise.all([
            fetchWithAuth("/api/users"),
            fetchWithAuth("/api/qrcodes"),
            fetchWithAuth("/api/analytics/summary"),
        ])

        if (!usersRes || !qrRes || !analyticsRes) return

        const usersData = await usersRes.json()
        const qrData = await qrRes.json()
        const analyticsData = await analyticsRes.json()

        document.getElementById("totalUsers").textContent = usersData.data?.length || 0
        document.getElementById("totalQRCodes").textContent = qrData.data?.length || 0
        document.getElementById("totalScans").textContent = analyticsData.data?.total_scans || 0
    }
    catch (error){
        console.error(error)
    }
}

const roleBadgeWrap = document.getElementById("roleBadgeWrap");
const currentRole = getCurrentRole();

if (roleBadgeWrap && currentRole) {
  roleBadgeWrap.innerHTML = `<div class="page-chip">Role: ${currentRole}</div>`;
}

loadOverview()