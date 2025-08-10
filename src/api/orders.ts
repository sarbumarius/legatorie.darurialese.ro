// src/api/orders.ts
import { OrderApiResponse } from "@/types/OrderApi";

const API_BASE = "https://crm.actium.ro";
const ORDERS_API_URL = `${API_BASE}/api/comenzi-daruri-alese-legatorie/productie`;

export async function fetchOrders(): Promise<OrderApiResponse[]> {
    const token = localStorage.getItem("authToken");
    const response = await fetch(ORDERS_API_URL, {
        headers: {
            "Authorization": token ? `Bearer ${token}` : "",
            "Accept": "application/json"
        }
    });
    if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
    }
    return response.json();
}

// POST /api/generare-factura/{id}
export async function generateFactura(id: number): Promise<any> {
    const token = localStorage.getItem("authToken");
    const url = `${API_BASE}/api/generare-factura/${id}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": token ? `Bearer ${token}` : "",
            "Accept": "application/json"
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const msg = (data && data.message) ? data.message : `Eroare API (factura): ${response.statusText}`;
        throw new Error(msg);
    }
    return data;
}

// POST /api/generare-bon/{id}
export async function generateBon(id: number): Promise<any> {
    const token = localStorage.getItem("authToken");
    const url = `${API_BASE}/api/generare-bon/${id}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": token ? `Bearer ${token}` : "",
            "Accept": "application/json"
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const msg = (data && data.message) ? data.message : `Eroare API (bon): ${response.statusText}`;
        throw new Error(msg);
    }
    return data;
}

// POST /api/muta-legatorie/{id}/{id_user}
export async function mutaLegatorie(id: number, userId: number): Promise<any> {
    const token = localStorage.getItem("authToken");
    const url = `${API_BASE}/api/muta-legatorie/${id}/${userId}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            "Authorization": token ? `Bearer ${token}` : "",
            "Accept": "application/json"
        }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const msg = (data && data.message) ? data.message : `Eroare API (mutare): ${response.statusText}`;
        throw new Error(msg);
    }
    return data;
}