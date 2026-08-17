# Fonu Desk Frontend

Fonu Desk Customer Support SaaS Frontend built with Next.js 16 (App Router), React 19, TypeScript, and Tailwind CSS.

---

## 🐳 Building & Running with Docker

### 1. Build the Docker Image
Build the production multi-stage Docker image, optionally passing the backend API URL as a build argument:

```bash
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:4000 -t fonu-desk-frontend .
```

### 2. Run the Container
Run the container detached on port 3000:

```bash
docker run -d -p 3000:3000 --name fonu-desk-frontend fonu-desk-frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Stop & Remove the Container

To stop the running container:
```bash
docker stop fonu-desk-frontend
```

To remove the container:
```bash
docker rm fonu-desk-frontend
```

To stop all running containers on your system:
```bash
docker stop $(docker ps -q)
```

---

## 🛠️ Local Development

### 1. Install Dependencies
```bash
yarn install
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 3. Run Development Server
```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Production Build & Linting
```bash
# Type check and production build
yarn build

# Run linter
yarn lint
```

