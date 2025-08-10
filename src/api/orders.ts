// src/api/orders.ts
import { OrderApiResponse } from "@/types/OrderApi";

const API_URL = "https://crm.actium.ro/api/comenzi-daruri-alese/productie";

export async function fetchOrders(): Promise<OrderApiResponse[]> {
    const token = localStorage.getItem("authToken");
    const response = await fetch(API_URL, {
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