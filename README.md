<h1 align="center"> Project Title: Contract Management Tool </h1>

<h1 align="center">Group Member Name: </h1>
<p align="center">
   Md Fazley Rabbe (1502895)  <br>
   Syed Tabish Talha Hassan (1502530)  <br>
   Mahidul Islam Rana (1502217) <br>
   Tusar Mozumder (1565539) <br>
</p>
<br/>

## Introduction

This project implements a Contract Management Tool developed as part of the Agile Development in Cloud Computing Environments course by a four-member SCRUM team (Oct 2025 – Jan 2026). The goal is to support the end-to-end lifecycle of contracts between a company and external service providers, from creation and negotiation to approval and activation.

The system was developed using SCRUM, with requirements captured as user stories and tracked across structured sprints. It is implemented as a full-stack web application, consisting of a React frontend and a Node.js/Express backend that communicates via REST APIs and persists data in MongoDB using Mongoose. Security and reliability are enforced through middleware such as validation, rate limiting, sanitization, and role-based access control.

A core feature of the tool is a multi-stage contract workflow, guiding contracts through drafting, procurement and legal review, provider offer submission, offer selection, final approval, and activation. Responsibilities are clearly assigned to defined roles (e.g., Client, Procurement Manager, Legal Counsel, Service Provider, Administrator), ensuring transparency, traceability, and auditability throughout the process.

Overall, the project delivers a stable and demonstrable Contract Management Tool that applies agile principles, supports collaboration, and meets the functional and technical objectives of the course.


## PROJECT IMPLEMENTATION: 
Our Contract Management project was implemented as a full-stack web application, where the backend handles business logic, authentication, and database operations, and the frontend provides the user interface for interacting with contracts and workflows. The backend is built with Node.js and connects to MongoDB. It requires basic configuration through environment variables (e.g., database URI, JWT secret, frontend URL), then it can be initialized with sample data using a seeding script. During development, the backend runs on port 5000 and exposes REST APIs consumed by the frontend. The frontend is built with React and is configured to communicate with the backend via REACT_APP_API_URL. For deployment, the backend runs in production mode using npm start, while the frontend is compiled into an optimized static build (npm run build) that can be served using any static hosting/server setup. This separation of concerns makes the system easier to maintain, test, and deploy. 

### Installation & Setup: 

<details>
<summary>Prerequisites:</summary>
  
- Node.js version ≥ 18.0.0 
- MongoDB (local installation or MongoDB Atlas) 
- npm or yarn as a package manager
  
</details>

<details>
<summary>Backend Setup Steps:</summary>
  
- Navigate into backend 
- cd backend 
- Install dependencies: 
-   npm install 
- Create environment file: 
- cp .env.example .env 
- Configure .env values (DB, JWT secret, frontend URL, etc.) 
- Seed database with sample users/data: 
- npm run seed 
- Start the backend dev server: 
- npm run dev 

The backend runs on a configured PORT 5000 

</details>

<details>
<summary>Frontend Setup Steps:</summary>
  
- Navigate into frontend 
- cd frontend 
- Install dependencies: 
- npm install 
- Set API URL env variable: 
- REACT_APP_API_URL=http://localhost:5000/api 
- Start the frontend: 
-  npm start
  
Frontend connects to backend through REACT_APP_API_URL 

</details>


<details>
<summary>Production Build / Run:</summary>
  
- Backend production run:
  
```bash
npm start
```
- Frontend build:
```bash
npm run build
```

- Server build folder via static server 

</details>

## TECHNOLOGY STACK: 

The backend is built with Node.js and Express.js to provide REST APIs for contract workflows, authentication, and data operations. MongoDB is used as the primary NoSQL database, while Mongoose manages schemas, validation, and database queries. Security is handled using JWT for stateless authentication, bcryptjs for password hashing, helmet for secure HTTP headers, and express-validator to validate and sanitize incoming requests. Operational features such as activity logging and debugging are supported with winston, and email notifications (e.g., account actions or workflow updates) are enabled through nodemailer. On the frontend, the application is developed with React to deliver a responsive user interface. React Router manages navigation between pages, while Zustand provides lightweight state management for shared application data such as user sessions and workflow states. User input and forms are handled using React Hook Form, combined with Yup for schema-based validation to ensure correct and consistent data entry. The frontend communicates with the backend using Axios, and generates contract documents 
using jsPDF. Additional utility libraries such as date-fns simplify date formatting and calculations, react-hot-toast provides real-time user feedback (success/error messages), and react-icons improves the overall UI experience.

<img width="712" height="498" alt="image" src="https://github.com/user-attachments/assets/2e205b42-c4b3-4c65-83ef-ce37ed378d7b" />

<img width="712" height="498" alt="image" src="https://github.com/user-attachments/assets/cc9ba080-8bdc-4514-95c6-d88ebe24d406" />

## ARCHITECTURE: 
This architecture follows a standard three-tier design: a React single-page application sends HTTP REST API requests to an Express.js backend, which processes each request through a middleware layer for security and reliability. After middleware validation, the request is handled by route modules grouped by domain. The server uses Mongoose ODM as the data access layer to validate and map objects to MongoDB collections, 
persisting core entities such as Users, Contracts, Offers, Providers, AuditLogs, and Reviews, then returns structured JSON responses back to the frontend for rendering dashboards and workflow steps.

<img width="1130" height="1190" alt="image" src="https://github.com/user-attachments/assets/b6f4ff55-1dc9-42d9-9f2d-46103a2ab957" />

## WORKFLOW DIAGRAM: 
This workflow diagram shows the contract lifecycle states and who acts at each step from creation to final approval. A contract starts in DRAFT when the client creates it, then moves to PENDING_PROCUREMENT after submission, where the Procurement Manager reviews it at this point, it can be REJECTED (end) or forwarded to PENDING_LEGAL for Legal Counsel review. From PENDING_LEGAL, it can again be REJECTED or moved to OPEN_FOR_OFFERS, where providers submit offers. Once offers are available, the coordinator selects one and changes the state to OFFER_SELECTED. The contract then moves to PENDING_FINAL_APPROVAL, where an Admin performs the final review; the outcome can be REJECTED or FINAL_APPROVED. Once FINAL_APPROVED, the contract is considered activated

<img width="1125" height="1035" alt="image" src="https://github.com/user-attachments/assets/cda80a21-2087-4ca3-a3bc-c88f56d12b77" />

## DEFAULT CREDENTIALS AS PERSONAS:

URL: https://contact-management-83lp.vercel.app/login

Adnin

Procurement Manager

Legal Counsel

Contract Coordinator



## PERMISSION MATRIX: 

<img width="697" height="750" alt="image" src="https://github.com/user-attachments/assets/c9de3b88-efe3-494c-b7d7-f241e5de097f" />

## CONCLUSION:

The Contract Management Platform project successfully delivered a modern, full-stack web application using industry-standard technologies, including React, Node.js, MongoDB, and JWT-based authentication. Developed within a cloud-based environment using the SCRUM agile methodology, the project progressed through four structured sprints, enabling a systematic transition from requirement analysis and system design to full implementation, integration, and final deployment. Continuous feedback, transparency, and iterative refinement were maintained throughout the development lifecycle. The final system provides a robust, role-based contract management platform that supports the complete contract lifecycle from creation and submission to multi-stage approval, provider collaboration, and final contract activation. The implementation of clearly defined user roles, including Client, Procurement Manager, Legal Counsel, Contract Coordinator, Service Provider, and Administrator, ensures secure access control and accountability at each stage of the workflow. The six-stage approval process, supported by audit logs and status tracking, enhances traceability and governance across all contract operations.






