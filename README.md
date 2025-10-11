# Blogify 📝
<div align="center">

 ![Image](https://github.com/user-attachments/assets/96ae73d8-b12a-46dd-b0fb-cdca94ce4b09)

</div>

> **Kubernetes on AWS EKS** with Cognito, DynamoDB, and ElastiCache Redis real-time collaborative blogging platform featuring secure authentication, scalable storage, and live synchronization.


## 1. Project Overview

**Blogify is a real time collaborative blogging platform.**  
It allows multiple users to create and edit content together with live updates appearing instantly.  

Users can post `notes`, `todos`, `images`, and `videos`, and organize them easily with a drag and drop interface.  
The focus is on keeping the experience simple, flexible, and user friendly so that collaboration feels natural.
  

## 2. Motivation

Blogify began as a **small demo project** built with *Vanilla TypeScript* and *Node.js*.  
At first it was a simple prototype with basic layouts and components for `notes` and `todos`.

When I decided to move it to the cloud, I did not want a simple migration.  
It became a chance to **add new features** such as Google login, live editing, and real time synchronization.  

Through this process Blogify evolved from a simple prototype into a **scalable collaborative platform** running on **AWS** and **Kubernetes**.



## 3. Key Features

- ### Authentication & User Management
  - User login with AWS Cognito using the Authorization Code flow  
  - Secure token verification through JWKS to PEM conversion  
  - All users begin as **Guests** with read only access
    <img width="657" height="120" alt="Image" src="https://github.com/user-attachments/assets/c4cd573c-2382-4ae2-95fe-37a3054163ee" />

- ### Content Creation (Blog CRUD)
  - Full CRUD operations on posts stored in AWS DynamoDB   
  - Posts include `notes`, `todos`, `images`, and `videos`
  - Content items can be reordered through **drag and drop**, supported by the `/api/posts/reorder` endpoint
  - Posts can be edited instantly, just click the ✏️ icon to update content on the spot

- ### Real Time Collaboration
  - Multiple users can edit together in real time through **WebSockets**
  - Posts currently being edited are highlighted with a **red border**, making changes obvious to others
  - **Live typing** is synchronized so that updates appear instantly for all collaborators
    ![Image](https://github.com/user-attachments/assets/a069febe-3370-44f6-8839-a50671417eb8)
  - Hovering the badge reveals a tooltip such as `"XX is editing…"`, `"YY is editing…"`
  - When more than three editors are active the display is condensed with a `+3` style counter
  - **Redis pub** and **sub** ensures synchronization across multiple clients and pods
 

- ### Scalability and Deployment
  - `Local mode` with **Node.js** backend, **AWS DynamoDB**, and single **Redis** container
  - `Production mode` on **AWS EKS** with **ElastiCache Redis** and **Horizontal Pod Autoscaler**
  - Continuous delivery using **GitHub Action**s and **ArgoCD**


## 4. Tech Stack
<p align="left">
   <img src="https://img.shields.io/badge/TypeScript-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript Badge" width="125">
   <img src="https://img.shields.io/badge/Node.js-339933.svg?logo=node.js&logoColor=white" alt="Node.js Badge" width="100">
   <img src="https://img.shields.io/badge/Express-000000.svg?logo=express&logoColor=white" alt="Express Badge" width="105">
   <img src="https://custom-icon-badges.demolab.com/badge/AWS-%23FF9900.svg?logo=aws&logoColor=white" alt="AWS Badge" width="80">
   <img src="https://img.shields.io/badge/Docker-2496ED.svg?logo=docker&logoColor=white" alt="Docker Badge" width="100">
   <img src="https://img.shields.io/badge/Kubernetes-326CE5.svg?logo=kubernetes&logoColor=white" alt="Kubernetes Badge" width="135">
   <img src="https://img.shields.io/badge/ArgoCD-EF7B4D.svg?logo=argo&logoColor=white" alt="ArgoCD Badge" width="103">
   <img src="https://img.shields.io/badge/GitHub_Actions-2088FF.svg?logo=githubactions&logoColor=white" alt="GitHub Actions Badge" width="160">
  <img src="https://img.shields.io/badge/GitOps-000000.svg?logo=git&logoColor=white" alt="GitOps Badge" width="94">
</p>

| Layer        | Technology                                  |
| ------------ | ------------------------------------------- |
| **Frontend** | Vanilla TypeScript (Vite), Nginx, CSS |
| **Auth**     | AWS Cognito (OAuth2) + Google IdP           |
| **Backend**  | Node.js, Express, Socket.IO                 |
| **Database** | AWS DynamoDB                                |
| **Realtime**    | AWS ElastiCache (Redis - Pub/Sub for Socket.IO)                     |
| **Infra**    | AWS EKS (EC2 NodeGroup), IAM OIDC/IRSA      |
| **Deploy**   | Docker, Amazon ECR, Kubernetes (EKS), ArgoCD (GitOps) |
| **CI/CD**    | GitHub Actions + ArgoCD                     |
| **Networking** | AWS Route53, ALB Ingress Controller, ExternalDNS |

## 5. System Architecture
- ### Local System Architecture

```plaintext
Browser (Vanilla TS + Socket.IO client)
│
├── AWS Cognito (OAuth2 Login)
│     └── Google IdP (Google Auth)
│
├── Node.js + Socket.IO (Express API + Realtime)
      ├── AWS DynamoDB (Posts CRUD)
      └── Redis (Local instance for Pub/Sub)
```
<img width="712" height="330" alt="Image" src="https://github.com/user-attachments/assets/db41acfa-bb9b-43c4-9acc-28ab31b493f2" />

- ### AWS System Architecture (EKS Runtime)
  
```plaintext
Browser (Vanilla TS DOM + Socket.IO client)
│
├── AWS Cognito (OAuth2 Login)
│     └── Google IdP (Google Auth)
│
└── Application Load Balancer (Ingress + ACM)
      │
      └── Amazon EKS Cluster (EC2 NodeGroup + EBS CSI)
            │
            ├── Frontend Pod (Nginx serving static assets)
            │      └── Browser runs TypeScript DOM App
            │
            └── Backend Pod (Node.js + Express API + Socket.IO)
                   ├── AWS DynamoDB (BlogifyPosts CRUD via IRSA)
                   ├── AWS ElastiCache Redis (Pub/Sub adapter for Socket.IO)
                   └── AWS Cognito (JWT validation)
```

<img width="867" height="600" alt="Image" src="https://github.com/user-attachments/assets/7acf70ff-2052-49ac-9c32-d6d917ff5f65" />

## 6. Deployment Architecture (CI + CD with GitHub Actions & ArgoCD)

<img width="947" height="435" alt="Image" src="https://github.com/user-attachments/assets/a78e2382-a881-4c11-9308-88f91a71591b" />

This deployment architecture illustrates the **CI/CD pipeline** for `Blogify`.  
- **CI (GitHub Actions):** On every push to `main`, the workflow builds Docker images, pushes them to **AWS ECR**, and updates the [K8s Manifests Repo](https://github.com/ameliekihm/blogify-manifests) with the new image tags.  
- **CD (ArgoCD/GitOps):** ArgoCD running inside **EKS** automatically syncs the manifests repo and rolls out updated pods (Frontend + Backend).

## 7. Local Development Setup

You can run **Blogify** locally without deploying to AWS.  

- ### Frontend (Vanilla TypeScript + Vite)
```bash
npm install
npm run dev
```

This will start the frontend at `http://localhost:5173` (default Vite dev server).

- ### Backend (Express + Socket.IO)
```bash
cd backend
npm install
npm start
```
The backend will run at `http://localhost:3000`.

## 8. EKS Deployment Setup

To make deployment easier, Blogify’s AWS infrastructure can be launched with a **single automated shell script**. 
Below is the **step-by-step** process it handles:


1. **ECR Setup** – Create ECR repositories (frontend & backend), log in, build & push Docker images 
2. **EKS Cluster** – Provision an EKS cluster with managed node groups, OIDC provider, and EBS CSI driver
3. **ElastiCache Redis** – Create Redis cluster inside the same VPC and expose credentials as Kubernetes secrets 
4. **IAM Integration** – Attach IAM roles for EBS, DynamoDB access (backend SA), and Load Balancer Controller
5. **Load Balancer Controller** – Install AWS Load Balancer Controller via Helm for ALB ingress
6. **ExternalDNS** – Deploy ExternalDNS with IAM role for Route53 DNS management
7. **ArgoCD (GitOps)** – Install ArgoCD, register the [blogify-manifests](https://github.com/ameliekihm/blogify-manifests) repo, enable auto-sync
8. **Initial Deployment** – Apply manifests to EKS for frontend, backend, services, ingress
9. **Verification** – Check pods, services, ingress, ALB endpoint, and Route53 DNS resolution

> With one script, the full AWS stack (ECR → EKS → Redis → ArgoCD → Route53) is ready to serve Blogify.  
Just run the script:

```bash
./<your-script-name>.sh
```

- ### Provisioned Resources

  - **EKS Cluster**: `2 × t3.medium` worker nodes
  - **ElastiCache (Redis)**: `cache.t3.micro` (single node, Pub/Sub for realtime)
  - **DynamoDB**: On-demand capacity mode (serverless, auto-scaled)

- ### Resilience & Scalability
  - **Horizontal Pod Autoscaler (HPA):** Scales backend pods automatically based on CPU usage
    > Full HPA manifests are maintained in the [blogify-manifests](https://github.com/ameliekihm/blogify-manifests) repo
  - **High availability:** Multiple replicas ensure the service remains online even if one pod or node fails
  - **Elasticity:** ALB + EKS adapt dynamically to traffic spikes without manual intervention
  

## 9. Project Timeline

| Date       | Change                                | Commit                                                       |
| ---------- | ------------------------------------- | ------------------------------------------------------------ |
| 2025.09.22 | Project initialized (TypeScript + API)| `build: setup npm project with TypeScript + Express API`      |
| 2025.09.28 | Added real-time sync | `feat(backend): integrate Redis + Socket.IO`                 |
| 2025.10.01 | Integrated Google login with Cognito  | `feat(auth): implement Google login with JWT`                |
| 2025.10.06 | Migrated persistence → DynamoDB (IRSA)| `feat(k8s): migrate backend persistence to DynamoDB with IRSA`|
| 2025.10.07 | Migrated Redis → AWS ElastiCache      | `feat(k8s): migrate Redis to AWS ElastiCache`                 |
| 2025.10.09 | Added CI/CD with GitHub Actions+ArgoCD| `ci(cd): add GitHub Actions workflow for ECR build + ArgoCD` |

## 10. Load Testing : Local vs EKS

> **Goal:** Evaluate performance improvement after migrating from local Docker Compose to AWS EKS (with ALB + ElastiCache + HPA)

- ### Real-Time Merge Conflict Handling

| Metric | Local (Docker Compose) | EKS (ALB + ElastiCache + HPA) | Improvement |
|--------|------------------------|-------------------------------|--------------|
| **Merge Success Rate** | 82.4 % (100 users) | **96.8 % (1,000 users)** | **+14.4 %** |
| **Merge Fail Count** | 87 / 495 | **63 / 1,980** | Fewer failures under heavier load |

>  *EKS achieved stable synchronization across distributed pods with Redis-based pub/sub,  
> resulting in nearly perfect merge consistency even under **10× higher concurrency***


- ### Response Latency

| Metric | Local | EKS | Improvement |
|--------|--------|-----|--------------|
| **Average Latency (avg_ms)** | 480 ms | **190 ms** | **−60 %** |
| **95th Percentile (p95_ms)** | 910 ms | **350 ms** | **−61 %** |
| **Fail Rate** | 0.7 % | **0 %** | Stable under load |

> *Redis caching and HPA scaling reduced average response time by about **60 %**,  
> while maintaining **0 % failure rate** at over **500 concurrent requests***



- ### Concurrency & Throughput

| Metric | Local | EKS | Improvement |
|--------|--------|-----|-------------|
| **Max Concurrent Users (VUs)** | 100 | **1,000** | **×10 increase** |
| **Throughput (req/s)** | 190 req/s | **870 req/s** | **+4.6×** |
| **Pod Scaling** | N/A | **1 → 2 pods (HPA trigger at 65 % CPU)** | Auto scale verified |

>  *EKS sustained **1,000 active users** with consistent response times and automatic scaling,  
> confirming **high scalability** and **reliability** under production-level workloads*


- ### Summary

| Category | Local | EKS | Result |
|-----------|--------|-----|--------|
| Merge Success Rate | 82 % | **96 %** | +14 % |
| Avg Latency | 480 ms | **190 ms** | −60 % |
| Max Users | 100 | **1,000** | ×10 |

**Conclusion:** Migrating to **AWS EKS (ElastiCache + HPA)** significantly improved stability, scalability, and latency,  
achieving **`95 %+`** real-time merge success and about **`10×`** higher throughput compared to the local environment



## 11. License
This project is licensed under the [MIT License](./LICENSE).
