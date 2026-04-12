# **App Name**: Flor de Batom

## Core Features:

- Dynamic Product Catalog: Browse a responsive grid of makeup products, featuring category filtering via 'pills', real-time search, and sorting options, all leveraging data from localStorage.
- Shopping Cart & Management: Add products to a persistent shopping cart (stored in localStorage), adjust quantities, and remove items via a sliding drawer, with a clear total and 'free shipping' indicator.
- WhatsApp Checkout Flow: Simplified checkout modal for customer details and payment selection (Money with change option, Pix with key and instructions), leading to a pre-formatted WhatsApp message for order placement.
- Admin Authentication & Dashboard: Secure administrative login and a dashboard to view key metrics like total orders, revenue, and product count, persisting session in sessionStorage.
- Product Management (Admin): Comprehensive CRUD (Create, Read, Update, Delete) interface within the admin panel for managing product inventory, details, images, and 'featured' status using localStorage.
- Order Tracking (Admin): View and manage customer orders, including filtering by status and date, and updating order lifecycle (Pendente, Em Separação, Em Entrega, Entregue) using localStorage, with a CSV export option.
- AI Product Description Assistant: Within the admin's product creation/edit forms, an AI tool suggesting detailed product descriptions based on the product's name and category to streamline content generation.

## Style Guidelines:

- Primary action color: A rich, deep berry tone (#7F174A) to convey elegance and sophistication, drawing attention to interactive elements.
- Background color: A subtle, blush-tinted off-white (#F5F1F3) providing a clean, airy canvas that allows product imagery to stand out.
- Accent color: A soft baby pink (#F8C8DC) to highlight secondary calls-to-action, badges, and key informational elements, ensuring visual hierarchy.
- Headline and display text: 'Cormorant Garamond' (serif) for an elegant, luxurious, and refined aesthetic. Body and UI text: 'DM Sans' (sans-serif) for clean readability and a modern, functional feel. Note: currently only Google Fonts are supported.
- Utilize a consistent suite of minimal, outline-style icons for functional elements like shopping cart, search, social media links, and administrative actions (edit, delete), ensuring clarity and modernity.
- Responsive grid-based product display with varying column counts for different breakpoints. Key navigational elements (header, category bar) are sticky. Cart and product details are presented in overlay modals or sliding drawers to maintain focus on the main catalog.
- Subtle visual feedback animations, such as `translateY` and soft shadow changes on product card hovers. Smooth slide-in/out transitions for the shopping cart drawer and modals. Product cards employ a fade-in effect upon entering the viewport. Toast notifications for user feedback use a 'slideInRight' animation.