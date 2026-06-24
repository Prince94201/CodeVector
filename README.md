# CodeVector Product Catalog Backend

A highly optimized Node.js + Express + MySQL backend demonstrating cursor-based pagination over a dataset of 200,000 products.

## Table of Contents
1. [Architecture & Design Decisions](#architecture--design-decisions)
   - [Cursor-Based Pagination vs OFFSET](#cursor-based-pagination-vs-offset)
   - [Composite Index Optimization](#composite-index-optimization)
2. [Prerequisites](#prerequisites)
3. [Setup & Running Locally](#setup--running-locally)
4. [Database Seeding](#database-seeding)
5. [GitHub Setup](#github-setup)
6. [Render & Cloud Database Deployment](#render--cloud-database-deployment)
7. [API Reference & Usage Examples](#api-reference--usage-examples)
8. [Future Enhancements](#future-enhancements)

---

## Architecture & Design Decisions

### Cursor-Based Pagination vs OFFSET

In traditional pagination (`LIMIT 100 OFFSET 100000`), the database must scan through and discard all prior `100,000` records before returning the next 100 rows. This leads to **$O(N)$ query complexity**, causing severe performance degradation on large datasets.

We chose **cursor-based pagination** (using a base64 encoded cursor of `created_at|id`) for two major reasons:
1. **Constant-Time Performance ($O(1)$)**: Because the cursor tells the database exactly where the last page ended, we can fetch the next page in constant time using index seeks.
2. **Consistency & Stability**: OFFSET pagination suffers from "page drift" or duplicate items when new products are inserted or deleted while a user is browsing. Cursor-based pagination relies on stable anchor points, ensuring zero duplicate or skipped products.

### Composite Index Optimization

To make pagination requests extremely fast, we created two indexes:
1. `idx_created_at_id (created_at DESC, id DESC)`
2. `idx_category_created_at_id (category, created_at DESC, id DESC)`

**Why?**
* When querying `ORDER BY created_at DESC, id DESC`, the database can perform an index scan directly in order without needing a separate sorting step (preventing `Filesort`).
* When using a cursor, the `WHERE (created_at < ? OR (created_at = ? AND id < ?))` condition maps perfectly to index boundaries.
* The secondary index with `category` as the leading column optimizes pagination when a user filters by category.

---

## Prerequisites

* **Node.js**: v18+ (tested on Node v24.2.0)
* **MySQL**: v8.0+ (tested on MySQL 9.6.0)

---

## Setup & Running Locally

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your credentials.
   ```bash
   cp .env.example .env
   ```
   Modify `.env`:
   ```env
   DB_HOST=127.0.0.1
   DB_USER=root
   DB_PASSWORD=your_password
   DB_NAME=codevector_db
   DB_PORT=3306
   DB_SSL_CA=
   PORT=3000
   ```

3. **Initialize Database Schema**:
   Make sure MySQL is running, then load `schema.sql`:
   ```bash
   mysql -h 127.0.0.1 -u root < schema.sql
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```
   The server will run on `http://localhost:3000`.

---

## Database Seeding

To populate the database with exactly 200,000 products:
```bash
npm run seed
```

**Seeding Implementation details:**
* Inserts products in batches of 5,000 using bulk `INSERT` queries.
* Runs within a **single database transaction** using a single connection from the pool.
* Automatically drops and recreates the product table records using `TRUNCATE TABLE`.
* Completes in **under 60 seconds** (typically ~3.5 seconds on SSD machines).

---

## GitHub Setup

Follow these steps to upload this project to GitHub. A `.gitignore` file has been added to prevent committing sensitive configuration (`.env`) or dependency files (`node_modules`).

1. **Initialize Git Repository**:
   ```bash
   git init
   ```

2. **Add Files and Commit**:
   ```bash
   git add .
   ```
   Verify that `.env` and `node_modules` are excluded (check with `git status`).
   ```bash
   git commit -m "Initial commit: Express + MySQL backend with cursor pagination"
   ```

3. **Link to GitHub and Push**:
   Create a new public/private repository on GitHub, then link it and push:
   ```bash
   git branch -M main
   git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

---

## Render & Cloud Database Deployment

Yes, **you must host the database in the cloud**. Render hosts your web service in a cloud container, meaning it cannot access your personal laptop's `localhost` or local port `3307`. Both the Express backend and the MySQL database must be deployed to the cloud.

### Step 1: Deploy a Cloud MySQL Database
Choose a managed cloud database provider with a free or low-cost tier:
* **Aiven** (Recommended for standard MySQL clusters)
* **Railway** (Very easy setup, supports MySQL out of the box)
* **Clever Cloud** (Has a free tier for shared MySQL instances)

Once you register:
1. Create a MySQL database (e.g. named `codevector_db`).
2. Download or enable SSL certificate support (required by Aiven). You can configure `DB_SSL_CA` by either pointing it to the local path of your downloaded `ca.pem` file, or by pasting the raw text content of the `ca.pem` certificate directly into the environment variable. Our database connector is designed to handle both formats.
3. Import your schema:
   ```bash
   mysql -h YOUR_CLOUD_DB_HOST -u YOUR_CLOUD_DB_USER -p -P YOUR_CLOUD_DB_PORT YOUR_CLOUD_DB_NAME < schema.sql
   ```
4. Run the seed script targeting the cloud database to populate it:
   ```bash
   DB_HOST=YOUR_CLOUD_DB_HOST DB_USER=YOUR_CLOUD_DB_USER DB_PASSWORD=YOUR_CLOUD_DB_PASSWORD DB_NAME=YOUR_CLOUD_DB_NAME DB_PORT=YOUR_CLOUD_DB_PORT npm run seed
   ```

### Step 2: Deploy the Web Service on Render
1. Log in to [Render](https://render.com) and click **New > Web Service**.
2. Connect your GitHub repository.
3. Configure the following service settings:
   * **Name**: `codevector-backend`
   * **Language**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `npm start`
4. Add the following **Environment Variables** in the Render settings:
   * `DB_HOST`: *Your Cloud Database Host*
   * `DB_USER`: *Your Cloud Database User*
   * `DB_PASSWORD`: *Your Cloud Database Password*
   * `DB_NAME`: *Your Cloud Database Name*
   * `DB_PORT`: *Your Cloud Database Port*
   * `PORT`: `10000` (Render's default port)
   * `NODE_ENV`: `production`
5. Click **Deploy Web Service**. Render will build the project and spin up the Express server.

---

## API Reference & Usage Examples

### 1. Health Check
* **Endpoint**: `GET /health`
* **Curl Example**:
  ```bash
  curl -s http://localhost:3000/health
  ```
* **Response**:
  ```json
  {"status":"ok"}
  ```

### 2. List Categories
* **Endpoint**: `GET /products/categories`
* **Curl Example**:
  ```bash
  curl -s http://localhost:3000/products/categories
  ```
* **Response**:
  ```json
  {"categories":["Books","Clothing","Electronics","Food","Sports","Toys"]}
  ```

### 3. List Products (with Cursor Pagination)
* **Endpoint**: `GET /products`
* **Query Parameters**:
  * `limit` (default: 20, max: 100)
  * `cursor` (base64 string representing `created_at|id`)
  * `category` (optional filter)
* **Curl Example (First Page)**:
  ```bash
  curl -s "http://localhost:3000/products?limit=2"
  ```
* **Response**:
  ```json
  {
    "data": [
      {
        "id": "520f6b1c-6fc8-11f1-945e-98b8d2f553be",
        "name": "Product 423973 #157018",
        "category": "Food",
        "price": "295.75",
        "created_at": "2026-06-24T12:29:12.324Z",
        "updated_at": "2026-06-24T12:29:31.756Z"
      },
      {
        "id": "51512ca6-6fc8-11f1-945e-98b8d2f553be",
        "name": "Product 688218 #87380",
        "category": "Books",
        "price": "88.11",
        "created_at": "2026-06-24T12:28:44.577Z",
        "updated_at": "2026-06-24T12:33:27.830Z"
      }
    ],
    "next_cursor": "MjAyNi0wNi0yNFQxMjoyODo0NC41NzdaLzUxNTEyY2E2LTZmYzgtMTFmMS05NDVlLTk4YjhkMmY1NTNiZQ==",
    "has_more": true,
    "count": 2
  }
  ```
* **Curl Example (Next Page using `next_cursor` value)**:
  ```bash
  curl -s "http://localhost:3000/products?limit=2&cursor=MjAyNi0wNi0yNFQxMjoyODo0NC41NzdaLzUxNTEyY2E2LTZmYzgtMTFmMS05NDVlLTk4YjhkMmY1NTNiZQ=="
  ```

---

## Future Enhancements

Given more time, we would implement:
1. **Redis Caching**: Cache individual pages or cursor results to prevent hitting the database for popular paginated listings.
2. **Snapshot Sessions**: Keep a snapshot ID of when the user starts paginating to prevent showing newer items added *after* the session started (making pagination even more stable).
3. **API Keys & Rate Limiting**: Secure the endpoints against scraping and DDoS attacks using rate-limiting middleware (like `express-rate-limit`).
4. **Structured Testing**: Integrate Mocha/Chai or Jest with Supertest to automate endpoint testing.
