# Sunmi POS System v2

Sistem Point of Sale (POS) modern dengan kontrol akses gate menggunakan QR code. Dibangun dengan React, Express.js, dan PostgreSQL.

## 🚀 Fitur Utama

- **QR Code Entry System**: Scan QR code untuk registrasi masuk pengunjung
- **Gate Access Control**: Kontrol akses gate menggunakan QR code validation
- **Product Management**: Kelola inventory, harga, stok, dan kategori produk
- **Shopping Cart**: Keranjang belanja dengan quantity controls
- **Payment Validation**: Upload bukti transfer dan validasi pembayaran oleh admin
- **Real-time Monitoring**: Dashboard admin dengan Socket.io untuk monitoring live
- **Admin Dashboard**: Interface lengkap untuk mengelola sistem

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Express.js + TypeScript + Socket.io
- **Database**: PostgreSQL 15 (Docker)
- **Authentication**: JWT + bcrypt
- **File Upload**: Multer untuk bukti pembayaran
- **QR Code**: react-qr-scanner + qrcode libraries

## 📋 Prerequisites

- Node.js 18+ 
- Docker & Docker Compose
- npm atau pnpm

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone <repository-url>
cd sunmi-pos-v2
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
Copy `.env.example` ke `.env` dan sesuaikan konfigurasi:
```bash
cp .env.example .env
```

### 4. Start PostgreSQL dengan Docker
```bash
npm run docker:up
```

### 5. Setup Database Schema
```bash
npm run db:setup
```

### 6. Start Development Server
```bash
npm run dev
```

Atau jalankan semuanya sekaligus:
```bash
npm run dev:full
```

## 🔧 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start frontend dan backend development server |
| `npm run dev:full` | Start Docker PostgreSQL + development server |
| `npm run client:dev` | Start frontend only (port 5173) |
| `npm run server:dev` | Start backend only (port 3000) |
| `npm run docker:up` | Start PostgreSQL container |
| `npm run docker:down` | Stop PostgreSQL container |
| `npm run docker:logs` | View PostgreSQL logs |
| `npm run db:setup` | Setup database schema dan initial data |
| `npm run build` | Build production |
| `npm run check` | TypeScript type checking |

## 🗄️ Database Schema

Sistem menggunakan 6 tabel utama:
- `admins` - Admin users dengan authentication
- `visitors` - Data pengunjung dengan QR code
- `products` - Inventory produk dengan kategori dan stok
- `orders` - Transaksi pembelian
- `order_items` - Detail item dalam order
- `gate_logs` - Log aktivitas akses gate

## 🔐 Default Admin Account

- **Email**: `admin@pos.com`
- **Password**: `admin123`

## 📱 User Flow

### Customer Journey:
1. Scan QR code di entry point → Registrasi masuk
2. Gunakan QR code untuk akses gate masuk
3. Browse produk dan tambah ke shopping cart
4. Checkout dengan QR code + upload bukti transfer
5. Tunggu admin validasi pembayaran
6. Keluar dengan QR code yang sama

### Admin Workflow:
1. Login ke admin dashboard
2. Monitor real-time visitor dan sales statistics
3. Kelola inventory dan harga produk
4. Review dan validasi pembayaran customer
5. Monitor gate access logs dan security

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Register admin baru
- `POST /api/auth/verify` - Verify JWT token

### Entry & QR Code
- `POST /api/entry/scan` - Scan QR code untuk entry
- `POST /api/qrcode/generate` - Generate QR code
- `GET /api/qrcode/verify/:qr_data` - Verify QR code

### Products
- `GET /api/products` - Get all products
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders & Payment
- `POST /api/orders` - Create order
- `PUT /api/orders/:id/validate` - Validate payment

## 🔧 Development

### Environment Variables
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sunmi_pos
DB_USER=postgres
DB_PASSWORD=postgres

# JWT Configuration
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=3000
NODE_ENV=development

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
```

### Docker Commands
```bash
# Start PostgreSQL
docker-compose up -d

# Stop PostgreSQL
docker-compose down

# View logs
docker-compose logs -f postgres

# Reset database
docker-compose down -v
docker-compose up -d
npm run db:setup
```

## 🚀 Production Deployment

### Build untuk Production
```bash
npm run build
```

### Environment Production
- Setup PostgreSQL database
- Update environment variables
- Configure reverse proxy (nginx)
- Setup SSL certificates
- Configure file upload directory

## 🤝 Contributing

1. Fork repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file for details

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  extends: [
    // other configs...
    // Enable lint rules for React
    reactX.configs['recommended-typescript'],
    // Enable lint rules for React DOM
    reactDom.configs.recommended,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```
