require('dotenv').config();
const mongoose = require('mongoose');
const { User, ServiceProvider, Contract, Provider, Offer } = require('../models');
const { ROLES, CONTRACT_TYPES, CONTRACT_STATUS, OFFER_STATUS } = require('../config/constants');
const logger = require('./logger');
const { generateContractRef } = require('./helpers');

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB for seeding');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      ServiceProvider.deleteMany({}),
      Contract.deleteMany({}),
      Provider.deleteMany({}),
      Offer.deleteMany({}),
    ]);
    logger.info('Cleared existing data');

    // Create admin user
    const admin = await User.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@contractmanagement.com',
      password: 'Admin@123',
      role: ROLES.ADMIN,
      isEmailVerified: true,
      isActive: true,
    });
    logger.info(`Admin user created: ${admin.email}`);

    // Create Procurement Manager
    const procurementManager = await User.create({
      firstName: 'Sarah',
      lastName: 'Procurement',
      email: 'procurement@contractmanagement.com',
      password: 'Procurement@123',
      role: ROLES.PROCUREMENT_MANAGER,
      isEmailVerified: true,
      isActive: true,
    });
    logger.info(`Procurement Manager created: ${procurementManager.email}`);

    // Create Legal Counsel
    const legalCounsel = await User.create({
      firstName: 'Michael',
      lastName: 'Legal',
      email: 'legal@contractmanagement.com',
      password: 'Legal@123',
      role: ROLES.LEGAL_COUNSEL,
      isEmailVerified: true,
      isActive: true,
    });
    logger.info(`Legal Counsel created: ${legalCounsel.email}`);

    // Create Contract Coordinator
    const contractCoordinator = await User.create({
      firstName: 'Emily',
      lastName: 'Coordinator',
      email: 'coordinator@contractmanagement.com',
      password: 'Coordinator@123',
      role: ROLES.CONTRACT_COORDINATOR,
      isEmailVerified: true,
      isActive: true,
    });
    logger.info(`Contract Coordinator created: ${contractCoordinator.email}`);

    // Create client users
    const clients = await User.create([
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: 'Client@123',
        role: ROLES.CLIENT,
        city: 'Berlin',
        country: 'Germany',
        phone: { countryCode: '+49', number: '1234567890' },
        isEmailVerified: true,
        isActive: true,
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: 'Client@123',
        role: ROLES.CLIENT,
        city: 'Munich',
        country: 'Germany',
        phone: { countryCode: '+49', number: '9876543210' },
        isEmailVerified: true,
        isActive: true,
      },
      {
        firstName: 'Robert',
        lastName: 'Wilson',
        email: 'robert.wilson@example.com',
        password: 'Client@123',
        role: ROLES.CLIENT,
        city: 'Frankfurt',
        country: 'Germany',
        phone: { countryCode: '+49', number: '5551234567' },
        isEmailVerified: true,
        isActive: true,
      },
    ]);
    logger.info(`Created ${clients.length} client users`);

    // Create service provider users
    const providerUsers = await User.create([
      {
        firstName: 'Tech',
        lastName: 'Solutions',
        email: 'tech.solutions@example.com',
        password: 'Provider@123',
        role: ROLES.SERVICE_PROVIDER,
        city: 'Frankfurt',
        country: 'Germany',
        isEmailVerified: true,
        isActive: true,
      },
      {
        firstName: 'Data',
        lastName: 'Experts',
        email: 'data.experts@example.com',
        password: 'Provider@123',
        role: ROLES.SERVICE_PROVIDER,
        city: 'Hamburg',
        country: 'Germany',
        isEmailVerified: true,
        isActive: true,
      },
      {
        firstName: 'Office',
        lastName: 'Pro',
        email: 'office.pro@example.com',
        password: 'Provider@123',
        role: ROLES.SERVICE_PROVIDER,
        city: 'Cologne',
        country: 'Germany',
        isEmailVerified: true,
        isActive: true,
      },
    ]);

    // Create service provider profiles
    const providers = await ServiceProvider.create([
      {
        user: providerUsers[0]._id,
        companyName: 'Tech Solutions GmbH',
        coreRole: 'IT Service Provider',
        expertise: ['Web Development', 'Cloud Infrastructure', 'DevOps'],
        bio: 'Leading IT solutions provider with 10+ years of experience',
        hourlyRate: { min: 75, max: 150, currency: 'EUR' },
        availability: 'available',
        completedTasks: 45,
        rating: { average: 4.8, count: 32 },
        isVerified: true,
        verifiedAt: new Date(),
      },
      {
        user: providerUsers[1]._id,
        companyName: 'Data Experts AG',
        coreRole: 'Data Server Management',
        expertise: ['Database Administration', 'Data Analytics', 'Server Management'],
        bio: 'Specialized in enterprise data solutions and server management',
        hourlyRate: { min: 80, max: 160, currency: 'EUR' },
        availability: 'available',
        completedTasks: 38,
        rating: { average: 4.6, count: 28 },
        isVerified: true,
        verifiedAt: new Date(),
      },
      {
        user: providerUsers[2]._id,
        companyName: 'Office Pro Services',
        coreRole: 'Office Administrator',
        expertise: ['Office Management', 'Administrative Support', 'Document Processing'],
        bio: 'Professional office administration and support services',
        hourlyRate: { min: 40, max: 80, currency: 'EUR' },
        availability: 'available',
        completedTasks: 62,
        rating: { average: 4.9, count: 48 },
        isVerified: true,
        verifiedAt: new Date(),
      },
    ]);
    logger.info(`Created ${providers.length} service providers`);

    // Create external providers with new schema
    const externalProviders = await Provider.create([
      {
        name: 'CloudTech Solutions GmbH',
        organization: null,
        email: 'contact@cloudtech-solutions.de',
        category: 'Data Server Management',
        tags: ['Cloud Infrastructure', 'DevOps', 'Security', 'AWS', 'Azure'],
        rating: 4.5,
        reviewsCount: 12,
        tasksCompleted: 45,
        rateMin: 80,
        rateMax: 150,
        availability: true,
        verified: true,
        verifiedAt: new Date(),
        phone: { countryCode: '+49', number: '30123456789' },
        address: {
          street: 'Alexanderplatz 1',
          city: 'Berlin',
          state: 'Berlin',
          postalCode: '10178',
          country: 'Germany',
        },
        description: 'Leading cloud solutions provider with expertise in AWS, Azure, and GCP.',
      },
      {
        name: 'Digital Innovations AG',
        organization: null,
        email: 'info@digital-innovations.de',
        category: 'Software Handling',
        tags: ['Web Development', 'Mobile Apps', 'Integration', 'API Development'],
        rating: 4.2,
        reviewsCount: 8,
        tasksCompleted: 28,
        rateMin: 70,
        rateMax: 130,
        availability: true,
        verified: false,
        phone: { countryCode: '+49', number: '89987654321' },
        address: {
          street: 'Maximilianstrasse 35',
          city: 'Munich',
          state: 'Bavaria',
          postalCode: '80539',
          country: 'Germany',
        },
        description: 'Innovative software solutions for modern businesses.',
      },
      {
        name: 'ServerPro Systems',
        organization: 'Data Experts AG',
        email: 'sales@serverpro.de',
        category: 'Data Server Management',
        tags: ['Server Administration', 'Database Management', 'Backup Solutions', 'Migration'],
        rating: 4.8,
        reviewsCount: 22,
        tasksCompleted: 62,
        rateMin: 75,
        rateMax: 140,
        availability: true,
        verified: true,
        verifiedAt: new Date(),
        phone: { countryCode: '+49', number: '40567891234' },
        address: {
          street: 'Hafenstrasse 100',
          city: 'Hamburg',
          state: 'Hamburg',
          postalCode: '20459',
          country: 'Germany',
        },
        description: 'Expert server and database management services.',
      },
      {
        name: 'WebMaster Pro',
        organization: null,
        email: 'hello@webmasterpro.de',
        category: 'IT Service',
        tags: ['Web Development', 'UI/UX Design', 'E-commerce', 'SEO'],
        rating: 4.7,
        reviewsCount: 35,
        tasksCompleted: 89,
        rateMin: 65,
        rateMax: 120,
        availability: true,
        verified: true,
        verifiedAt: new Date(),
        phone: { countryCode: '+49', number: '21198765432' },
        address: {
          street: 'Königsallee 92',
          city: 'Düsseldorf',
          state: 'North Rhine-Westphalia',
          postalCode: '40212',
          country: 'Germany',
        },
        description: 'Full-service web development agency with award-winning designs.',
      },
      {
        name: 'Enterprise IT Solutions',
        organization: 'Global Tech Corp',
        email: 'enterprise@globaltech.de',
        category: 'IT Service',
        tags: ['Enterprise Software', 'System Integration', 'Consulting', 'Support'],
        rating: 4.4,
        reviewsCount: 18,
        tasksCompleted: 52,
        rateMin: 90,
        rateMax: 180,
        availability: true,
        verified: true,
        verifiedAt: new Date(),
        phone: { countryCode: '+49', number: '69123789456' },
        address: {
          street: 'Bankenviertel 45',
          city: 'Frankfurt',
          state: 'Hesse',
          postalCode: '60311',
          country: 'Germany',
        },
        description: 'Enterprise-grade IT solutions for large corporations.',
      },
      {
        name: 'AdminAssist GmbH',
        organization: null,
        email: 'service@adminassist.de',
        category: 'Office Administrator',
        tags: ['Virtual Assistant', 'Document Management', 'Scheduling', 'Customer Support'],
        rating: 4.6,
        reviewsCount: 42,
        tasksCompleted: 156,
        rateMin: 35,
        rateMax: 65,
        availability: true,
        verified: true,
        verifiedAt: new Date(),
        phone: { countryCode: '+49', number: '30987123456' },
        address: {
          street: 'Friedrichstrasse 123',
          city: 'Berlin',
          state: 'Berlin',
          postalCode: '10117',
          country: 'Germany',
        },
        description: 'Professional administrative support services.',
      },
    ]);
    logger.info(`Created ${externalProviders.length} external providers`);

    // ============================================
    // CREATE DEMO CONTRACTS AT DIFFERENT STAGES
    // ============================================

    const contracts = [];

    // ----- 1. DRAFT Contracts (2 contracts) -----
    contracts.push(await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Office Administration Support',
      contractType: CONTRACT_TYPES.OFFICE_ADMINISTRATOR,
      description: 'Part-time office administration support including document management, scheduling, and general administrative tasks. Looking for experienced administrator.',
      targetConditions: 'German language proficiency required. Experience with modern office tools and software. Must be available for on-site work twice a week.',
      targetPersons: 1,
      budget: { minimum: 2000, maximum: 3500, currency: 'EUR' },
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.DRAFT,
      client: clients[1]._id,
    }));

    contracts.push(await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Mobile App Development - Phase 1',
      contractType: CONTRACT_TYPES.SOFTWARE_HANDLING,
      description: 'Development of a mobile application for iOS and Android platforms. Initial phase covers UI/UX design and core functionality implementation.',
      targetConditions: 'Cross-platform development preferred. Must follow material design guidelines. Weekly progress reports required.',
      targetPersons: 2,
      budget: { minimum: 15000, maximum: 25000, currency: 'EUR' },
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.DRAFT,
      client: clients[2]._id,
    }));

    // ----- 2. PENDING_PROCUREMENT Contracts (2 contracts) -----
    contracts.push(await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Database Migration Project',
      contractType: CONTRACT_TYPES.DATA_SERVER_MANAGEMENT,
      description: 'Migration of legacy database systems to modern cloud infrastructure. Includes data cleaning, transformation, and validation processes.',
      targetConditions: 'Zero data loss during migration. Minimal downtime required. Complete backup strategy must be in place.',
      targetPersons: 2,
      budget: { minimum: 8000, maximum: 12000, currency: 'EUR' },
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.PENDING_PROCUREMENT,
      client: clients[0]._id,
    }));

    contracts.push(await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'IT Security Audit',
      contractType: CONTRACT_TYPES.IT_SERVICE,
      description: 'Comprehensive security audit of existing IT infrastructure including vulnerability assessment, penetration testing, and compliance review.',
      targetConditions: 'Certified security professionals only. NDA required. Must provide detailed report with remediation recommendations.',
      targetPersons: 2,
      budget: { minimum: 10000, maximum: 18000, currency: 'EUR' },
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.PENDING_PROCUREMENT,
      client: clients[2]._id,
    }));

    // ----- 3. PENDING_LEGAL Contracts (2 contracts) -----
    contracts.push(await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Enterprise Website Development',
      contractType: CONTRACT_TYPES.IT_SERVICE,
      description: 'Development of a modern enterprise website with CMS integration, user authentication, and responsive design. Must support multiple languages.',
      targetConditions: 'Must be completed with full documentation and testing. Should follow best practices for security and accessibility.',
      targetPersons: 3,
      budget: { minimum: 15000, maximum: 25000, currency: 'EUR' },
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.PENDING_LEGAL,
      client: clients[0]._id,
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Budget and timeline are acceptable. Approved for legal review.',
        },
      },
    }));

    contracts.push(await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Data Analytics Platform Setup',
      contractType: CONTRACT_TYPES.DATA_SERVER_MANAGEMENT,
      description: 'Setup and configuration of a comprehensive data analytics platform including data warehouse, ETL pipelines, and visualization dashboards.',
      targetConditions: 'Must support real-time analytics. Integration with existing systems required. Training for staff included.',
      targetPersons: 2,
      budget: { minimum: 20000, maximum: 35000, currency: 'EUR' },
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.PENDING_LEGAL,
      client: clients[1]._id,
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Strong business case. Budget approved.',
        },
      },
    }));

    // ----- 4. OPEN_FOR_OFFERS Contracts (3 contracts with offers) -----
    const openContract1 = await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Software Integration Project',
      contractType: CONTRACT_TYPES.SOFTWARE_HANDLING,
      description: 'Integration of multiple software systems including ERP, CRM, and inventory management. API development and data synchronization required.',
      targetConditions: 'Must maintain data integrity across all systems. Comprehensive testing and documentation required.',
      targetPersons: 4,
      budget: { minimum: 20000, maximum: 35000, currency: 'EUR' },
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.OPEN_FOR_OFFERS,
      client: clients[1]._id,
      openForOffersAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Approved - meets all requirements',
        },
        legal: {
          reviewedBy: legalCounsel._id,
          reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Legal review completed - no issues found',
        },
      },
    });
    contracts.push(openContract1);

    const openContract2 = await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'E-commerce Platform Development',
      contractType: CONTRACT_TYPES.IT_SERVICE,
      description: 'Development of a full-featured e-commerce platform with payment gateway integration, inventory management, and customer portal.',
      targetConditions: 'PCI DSS compliance required. Must support multiple payment methods. Mobile-responsive design mandatory.',
      targetPersons: 3,
      budget: { minimum: 30000, maximum: 50000, currency: 'EUR' },
      startDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.OPEN_FOR_OFFERS,
      client: clients[0]._id,
      openForOffersAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Strategic project approved',
        },
        legal: {
          reviewedBy: legalCounsel._id,
          reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Payment compliance requirements noted',
        },
      },
    });
    contracts.push(openContract2);

    const openContract3 = await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Office Digitalization Project',
      contractType: CONTRACT_TYPES.OFFICE_ADMINISTRATOR,
      description: 'Complete digitalization of office processes including document management system, workflow automation, and digital archiving.',
      targetConditions: 'GDPR compliance required. Must integrate with existing email systems. Training for all staff members included.',
      targetPersons: 2,
      budget: { minimum: 8000, maximum: 15000, currency: 'EUR' },
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.OPEN_FOR_OFFERS,
      client: clients[2]._id,
      openForOffersAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Cost-effective solution approved',
        },
        legal: {
          reviewedBy: legalCounsel._id,
          reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'GDPR requirements documented',
        },
      },
    });
    contracts.push(openContract3);

    // ----- 5. PENDING_FINAL_APPROVAL Contracts (2 contracts with selected offers) -----
    const pendingApprovalContract1 = await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Cloud Infrastructure Setup',
      contractType: CONTRACT_TYPES.DATA_SERVER_MANAGEMENT,
      description: 'Complete cloud infrastructure setup including virtual servers, networking, security configurations, and monitoring systems.',
      targetConditions: 'Must follow security best practices. High availability required with 99.9% uptime SLA.',
      targetPersons: 2,
      budget: { minimum: 25000, maximum: 40000, currency: 'EUR' },
      startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.PENDING_FINAL_APPROVAL,
      client: clients[0]._id,
      openForOffersAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Budget approved',
        },
        legal: {
          reviewedBy: legalCounsel._id,
          reviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'SLA terms are acceptable',
        },
        coordinator: {
          selectedBy: contractCoordinator._id,
          selectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          notes: 'Best value offer selected',
        },
      },
    });
    contracts.push(pendingApprovalContract1);

    const pendingApprovalContract2 = await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'CRM System Implementation',
      contractType: CONTRACT_TYPES.SOFTWARE_HANDLING,
      description: 'Implementation of a new CRM system including data migration from legacy system, customization, and user training.',
      targetConditions: 'Must support salesforce automation. Integration with existing email and calendar systems required.',
      targetPersons: 3,
      budget: { minimum: 18000, maximum: 30000, currency: 'EUR' },
      startDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.PENDING_FINAL_APPROVAL,
      client: clients[1]._id,
      openForOffersAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Critical business need approved',
        },
        legal: {
          reviewedBy: legalCounsel._id,
          reviewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Data handling terms approved',
        },
        coordinator: {
          selectedBy: contractCoordinator._id,
          selectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          notes: 'Selected based on experience and competitive pricing',
        },
      },
    });
    contracts.push(pendingApprovalContract2);

    // ----- 6. FINAL_APPROVED Contracts (2 contracts - completed workflow) -----
    const finalApprovedContract1 = await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Network Infrastructure Upgrade',
      contractType: CONTRACT_TYPES.IT_SERVICE,
      description: 'Complete upgrade of company network infrastructure including new switches, routers, and firewall systems.',
      targetConditions: 'Zero downtime during business hours. Must include 2-year warranty and support.',
      targetPersons: 2,
      budget: { minimum: 35000, maximum: 50000, currency: 'EUR' },
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.FINAL_APPROVED,
      client: clients[0]._id,
      openForOffersAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Infrastructure upgrade approved',
        },
        legal: {
          reviewedBy: legalCounsel._id,
          reviewedAt: new Date(Date.now() - 22 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Warranty terms verified',
        },
        coordinator: {
          selectedBy: contractCoordinator._id,
          selectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          notes: 'Best technical proposal selected',
        },
        finalApproval: {
          approvedBy: admin._id,
          approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          notes: 'Final approval granted. Contract is now active.',
        },
      },
    });
    contracts.push(finalApprovedContract1);

    const finalApprovedContract2 = await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'HR Management System',
      contractType: CONTRACT_TYPES.SOFTWARE_HANDLING,
      description: 'Implementation of comprehensive HR management system including recruitment, onboarding, payroll, and performance management modules.',
      targetConditions: 'GDPR compliant. Must integrate with existing payroll provider. Mobile app for employees required.',
      targetPersons: 4,
      budget: { minimum: 40000, maximum: 60000, currency: 'EUR' },
      startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.FINAL_APPROVED,
      client: clients[2]._id,
      openForOffersAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'Strategic HR initiative approved',
        },
        legal: {
          reviewedBy: legalCounsel._id,
          reviewedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
          status: 'approved',
          notes: 'GDPR compliance verified',
        },
        coordinator: {
          selectedBy: contractCoordinator._id,
          selectedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          notes: 'Selected for comprehensive feature set',
        },
        finalApproval: {
          approvedBy: admin._id,
          approvedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          notes: 'Approved. Implementation can begin.',
        },
      },
    });
    contracts.push(finalApprovedContract2);

    // ----- 7. REJECTED Contract (1 contract) -----
    contracts.push(await Contract.create({
      referenceNumber: generateContractRef(),
      title: 'Experimental AI Project',
      contractType: CONTRACT_TYPES.IT_SERVICE,
      description: 'Experimental artificial intelligence project for automated customer service.',
      targetConditions: 'Must demonstrate 95% accuracy in customer query resolution.',
      targetPersons: 5,
      budget: { minimum: 100000, maximum: 150000, currency: 'EUR' },
      startDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      status: CONTRACT_STATUS.REJECTED,
      client: clients[0]._id,
      rejectionReason: 'Budget exceeds current fiscal year allocation. Please resubmit with revised budget for next quarter.',
      workflow: {
        procurement: {
          reviewedBy: procurementManager._id,
          reviewedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: 'rejected',
          notes: 'Budget too high for current period',
        },
      },
    }));

    logger.info(`Created ${contracts.length} demo contracts at various stages`);

    // ============================================
    // CREATE DEMO OFFERS
    // ============================================

    // Offers for openContract1 (Software Integration Project) - 4 offers
    const offers1 = await Offer.create([
      {
        contract: openContract1._id,
        provider: externalProviders[0]._id, // CloudTech Solutions
        offerAmount: { amount: 28000, currency: 'EUR' },
        proposedTimeline: {
          startDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
        },
        description: 'We offer comprehensive software integration with our proven methodology. Our team has extensive experience with ERP and CRM systems integration.',
        deliverables: [
          { title: 'Requirements Analysis', description: 'Detailed analysis of existing systems and integration requirements' },
          { title: 'Integration Architecture', description: 'Design of robust integration framework with API specifications' },
          { title: 'Implementation', description: 'Full implementation with iterative testing' },
          { title: 'Documentation', description: 'Complete technical and user documentation' },
        ],
        providerDetails: {
          companyName: 'CloudTech Solutions GmbH',
          role: 'Lead Integration Architect',
        },
        terms: 'Payment in 3 milestones: 30% upfront, 40% mid-project, 30% on completion.',
        status: OFFER_STATUS.PENDING,
      },
      {
        contract: openContract1._id,
        provider: externalProviders[1]._id, // Digital Innovations
        offerAmount: { amount: 32000, currency: 'EUR' },
        proposedTimeline: {
          startDate: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 110 * 24 * 60 * 60 * 1000),
        },
        description: 'Premium integration service with dedicated project manager and 24/7 support during implementation phase. We guarantee seamless integration.',
        deliverables: [
          { title: 'Project Planning', description: 'Comprehensive project plan with risk assessment' },
          { title: 'Custom APIs', description: 'Development of custom REST APIs for all integrations' },
          { title: 'Testing & QA', description: 'Rigorous automated and manual testing process' },
          { title: 'Training', description: 'On-site staff training sessions (2 days)' },
        ],
        providerDetails: {
          companyName: 'Digital Innovations AG',
          role: 'Integration Specialist',
        },
        terms: 'Fixed price with 6-month post-implementation support included.',
        status: OFFER_STATUS.PENDING,
      },
      {
        contract: openContract1._id,
        provider: externalProviders[4]._id, // Enterprise IT Solutions
        offerAmount: { amount: 34500, currency: 'EUR' },
        proposedTimeline: {
          startDate: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 95 * 24 * 60 * 60 * 1000),
        },
        description: 'Enterprise-grade integration solution with our proprietary middleware platform. Fastest delivery time with proven track record.',
        deliverables: [
          { title: 'Discovery Phase', description: 'Business requirements gathering and system audit' },
          { title: 'Middleware Setup', description: 'Configuration of integration middleware' },
          { title: 'Data Migration', description: 'Secure data migration with validation' },
          { title: 'Go-Live Support', description: '2 weeks of dedicated go-live support' },
        ],
        providerDetails: {
          companyName: 'Enterprise IT Solutions',
          role: 'Senior Solution Architect',
        },
        terms: 'Monthly billing based on milestones achieved.',
        status: OFFER_STATUS.PENDING,
      },
      {
        contract: openContract1._id,
        provider: externalProviders[3]._id, // WebMaster Pro
        offerAmount: { amount: 26500, currency: 'EUR' },
        proposedTimeline: {
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 115 * 24 * 60 * 60 * 1000),
        },
        description: 'Cost-effective integration solution leveraging modern cloud-native technologies. Perfect balance of quality and budget.',
        deliverables: [
          { title: 'System Analysis', description: 'Detailed analysis of current systems' },
          { title: 'API Development', description: 'RESTful API development and documentation' },
          { title: 'Integration Testing', description: 'Comprehensive integration testing suite' },
          { title: 'Maintenance Guide', description: 'Maintenance and troubleshooting documentation' },
        ],
        providerDetails: {
          companyName: 'WebMaster Pro',
          role: 'Full Stack Developer',
        },
        terms: '50% upfront, 50% on successful deployment.',
        status: OFFER_STATUS.PENDING,
      },
    ]);

    // Offers for openContract2 (E-commerce Platform) - 3 offers
    const offers2 = await Offer.create([
      {
        contract: openContract2._id,
        provider: externalProviders[3]._id, // WebMaster Pro
        offerAmount: { amount: 42000, currency: 'EUR' },
        proposedTimeline: {
          startDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 140 * 24 * 60 * 60 * 1000),
        },
        description: 'Full-featured e-commerce platform built on modern tech stack. We have delivered 50+ successful e-commerce projects.',
        deliverables: [
          { title: 'UI/UX Design', description: 'Custom responsive design with mobile-first approach' },
          { title: 'Platform Development', description: 'Full e-commerce platform with admin panel' },
          { title: 'Payment Integration', description: 'Multiple payment gateway integrations' },
          { title: 'SEO Optimization', description: 'On-page SEO and performance optimization' },
        ],
        providerDetails: {
          companyName: 'WebMaster Pro',
          role: 'E-commerce Lead Developer',
        },
        terms: 'Milestone-based payments. 12 months free maintenance included.',
        status: OFFER_STATUS.PENDING,
      },
      {
        contract: openContract2._id,
        provider: externalProviders[1]._id, // Digital Innovations
        offerAmount: { amount: 48000, currency: 'EUR' },
        proposedTimeline: {
          startDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 145 * 24 * 60 * 60 * 1000),
        },
        description: 'Premium e-commerce solution with AI-powered product recommendations and advanced analytics dashboard.',
        deliverables: [
          { title: 'Platform Architecture', description: 'Scalable microservices architecture' },
          { title: 'Core Development', description: 'E-commerce platform with all features' },
          { title: 'AI Features', description: 'Product recommendation engine' },
          { title: 'Analytics Dashboard', description: 'Real-time sales and customer analytics' },
        ],
        providerDetails: {
          companyName: 'Digital Innovations AG',
          role: 'Technical Director',
        },
        terms: 'Fixed price. Premium support package available.',
        status: OFFER_STATUS.PENDING,
      },
      {
        contract: openContract2._id,
        provider: externalProviders[4]._id, // Enterprise IT Solutions
        offerAmount: { amount: 45000, currency: 'EUR' },
        proposedTimeline: {
          startDate: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 135 * 24 * 60 * 60 * 1000),
        },
        description: 'Enterprise-class e-commerce platform with B2B and B2C capabilities. Highly scalable and secure.',
        deliverables: [
          { title: 'Platform Setup', description: 'Magento/Shopify enterprise setup' },
          { title: 'Customization', description: 'Full custom theme and plugins' },
          { title: 'Integration', description: 'ERP and inventory system integration' },
          { title: 'Training', description: 'Admin and staff training program' },
        ],
        providerDetails: {
          companyName: 'Enterprise IT Solutions',
          role: 'E-commerce Architect',
        },
        terms: 'Quarterly payments. SLA included.',
        status: OFFER_STATUS.PENDING,
      },
    ]);

    // Offers for openContract3 (Office Digitalization) - 2 offers
    const offers3 = await Offer.create([
      {
        contract: openContract3._id,
        provider: externalProviders[5]._id, // AdminAssist
        offerAmount: { amount: 12000, currency: 'EUR' },
        proposedTimeline: {
          startDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
        },
        description: 'Comprehensive office digitalization using proven document management solutions. GDPR compliance guaranteed.',
        deliverables: [
          { title: 'Process Analysis', description: 'Current workflow analysis and optimization plan' },
          { title: 'DMS Implementation', description: 'Document management system setup' },
          { title: 'Workflow Automation', description: 'Automated approval workflows' },
          { title: 'Staff Training', description: 'Comprehensive training for all users' },
        ],
        providerDetails: {
          companyName: 'AdminAssist GmbH',
          role: 'Digital Transformation Consultant',
        },
        terms: 'Fixed price. 3 months post-implementation support.',
        status: OFFER_STATUS.PENDING,
      },
      {
        contract: openContract3._id,
        provider: externalProviders[1]._id, // Digital Innovations
        offerAmount: { amount: 14500, currency: 'EUR' },
        proposedTimeline: {
          startDate: new Date(Date.now() + 16 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 58 * 24 * 60 * 60 * 1000),
        },
        description: 'Modern cloud-based office digitalization with AI-powered document classification and search.',
        deliverables: [
          { title: 'Cloud Setup', description: 'Secure cloud infrastructure setup' },
          { title: 'Document System', description: 'AI-powered document management' },
          { title: 'Mobile App', description: 'Mobile access for remote workers' },
          { title: 'Migration', description: 'Legacy document migration and indexing' },
        ],
        providerDetails: {
          companyName: 'Digital Innovations AG',
          role: 'Cloud Solutions Architect',
        },
        terms: 'Monthly subscription after initial setup.',
        status: OFFER_STATUS.PENDING,
      },
    ]);

    // Update offer counts on open contracts
    await Contract.findByIdAndUpdate(openContract1._id, { $set: { 'metadata.offerCount': 4 } });
    await Contract.findByIdAndUpdate(openContract2._id, { $set: { 'metadata.offerCount': 3 } });
    await Contract.findByIdAndUpdate(openContract3._id, { $set: { 'metadata.offerCount': 2 } });

    logger.info(`Created ${offers1.length + offers2.length + offers3.length} demo offers for open contracts`);

    // Create selected offers for pending final approval contracts
    const selectedOffer1 = await Offer.create({
      contract: pendingApprovalContract1._id,
      provider: externalProviders[2]._id, // ServerPro Systems
      offerAmount: { amount: 35000, currency: 'EUR' },
      proposedTimeline: {
        startDate: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 85 * 24 * 60 * 60 * 1000),
      },
      description: 'Complete cloud infrastructure setup with our expert team. We specialize in high-availability configurations with 99.99% uptime.',
      deliverables: [
        { title: 'Infrastructure Design', description: 'Architecture and design documentation' },
        { title: 'Server Setup', description: 'Virtual server provisioning and configuration' },
        { title: 'Security Configuration', description: 'Firewall, VPN, and security hardening' },
        { title: 'Monitoring', description: '24/7 monitoring and alerting system' },
      ],
      providerDetails: {
        companyName: 'ServerPro Systems',
        role: 'Cloud Infrastructure Engineer',
      },
      terms: 'Includes 3 months of free monitoring after go-live.',
      status: OFFER_STATUS.SELECTED,
      selectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      selectedBy: contractCoordinator._id,
      selectionNotes: 'Best technical proposal with competitive pricing and excellent track record.',
    });

    const selectedOffer2 = await Offer.create({
      contract: pendingApprovalContract2._id,
      provider: externalProviders[1]._id, // Digital Innovations
      offerAmount: { amount: 25000, currency: 'EUR' },
      proposedTimeline: {
        startDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 70 * 24 * 60 * 60 * 1000),
      },
      description: 'Comprehensive CRM implementation with our certified team. We have implemented 100+ CRM systems successfully.',
      deliverables: [
        { title: 'CRM Setup', description: 'Platform configuration and customization' },
        { title: 'Data Migration', description: 'Safe migration from legacy system' },
        { title: 'Integration', description: 'Email and calendar integration' },
        { title: 'User Training', description: 'Role-based training sessions' },
      ],
      providerDetails: {
        companyName: 'Digital Innovations AG',
        role: 'CRM Implementation Specialist',
      },
      terms: 'Fixed price with 6-month support included.',
      status: OFFER_STATUS.SELECTED,
      selectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      selectedBy: contractCoordinator._id,
      selectionNotes: 'Selected based on extensive CRM experience and competitive pricing.',
    });

    // Update pending approval contracts with selected offer references
    await Contract.findByIdAndUpdate(pendingApprovalContract1._id, {
      $set: {
        'workflow.coordinator.selectedOffer': selectedOffer1._id,
        'metadata.offerCount': 1,
      },
    });
    await Contract.findByIdAndUpdate(pendingApprovalContract2._id, {
      $set: {
        'workflow.coordinator.selectedOffer': selectedOffer2._id,
        'metadata.offerCount': 1,
      },
    });

    // Create selected offers for final approved contracts
    const finalOffer1 = await Offer.create({
      contract: finalApprovedContract1._id,
      provider: externalProviders[0]._id, // CloudTech Solutions
      offerAmount: { amount: 45000, currency: 'EUR' },
      proposedTimeline: {
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      },
      description: 'Enterprise network upgrade with zero-downtime deployment strategy.',
      deliverables: [
        { title: 'Network Audit', description: 'Current infrastructure assessment' },
        { title: 'Hardware Deployment', description: 'New equipment installation' },
        { title: 'Configuration', description: 'Network configuration and testing' },
        { title: 'Documentation', description: 'Network documentation and diagrams' },
      ],
      providerDetails: {
        companyName: 'CloudTech Solutions GmbH',
        role: 'Network Engineer',
      },
      terms: '2-year warranty and support included.',
      status: OFFER_STATUS.SELECTED,
      selectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      selectedBy: contractCoordinator._id,
      selectionNotes: 'Best overall proposal with warranty included.',
    });

    const finalOffer2 = await Offer.create({
      contract: finalApprovedContract2._id,
      provider: externalProviders[4]._id, // Enterprise IT Solutions
      offerAmount: { amount: 55000, currency: 'EUR' },
      proposedTimeline: {
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      },
      description: 'Comprehensive HR management system implementation with all requested modules.',
      deliverables: [
        { title: 'HR Platform Setup', description: 'Core HR system configuration' },
        { title: 'Module Implementation', description: 'All HR modules setup' },
        { title: 'Payroll Integration', description: 'Integration with payroll provider' },
        { title: 'Mobile App', description: 'Employee self-service mobile app' },
      ],
      providerDetails: {
        companyName: 'Enterprise IT Solutions',
        role: 'HR Systems Consultant',
      },
      terms: 'Annual maintenance contract available.',
      status: OFFER_STATUS.SELECTED,
      selectedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      selectedBy: contractCoordinator._id,
      selectionNotes: 'Comprehensive solution with all required features.',
    });

    // Update final approved contracts with selected offer references
    await Contract.findByIdAndUpdate(finalApprovedContract1._id, {
      $set: {
        'workflow.coordinator.selectedOffer': finalOffer1._id,
        'metadata.offerCount': 1,
      },
    });
    await Contract.findByIdAndUpdate(finalApprovedContract2._id, {
      $set: {
        'workflow.coordinator.selectedOffer': finalOffer2._id,
        'metadata.offerCount': 1,
      },
    });

    logger.info('Created and linked selected offers for pending and approved contracts');

    logger.info('\n========================================');
    logger.info('DEMO SEEDING COMPLETED SUCCESSFULLY!');
    logger.info('========================================\n');

    logger.info('--- Demo Data Summary ---');
    logger.info(`Total Contracts: ${contracts.length}`);
    logger.info('  - Draft: 2');
    logger.info('  - Pending Procurement: 2');
    logger.info('  - Pending Legal: 2');
    logger.info('  - Open for Offers: 3 (with 9 total offers)');
    logger.info('  - Pending Final Approval: 2 (with selected offers)');
    logger.info('  - Final Approved: 2 (completed workflow)');
    logger.info('  - Rejected: 1');
    logger.info(`Total Offers: ${offers1.length + offers2.length + offers3.length + 4}`);
    logger.info(`External Providers: ${externalProviders.length}`);

    logger.info('\n--- Login Credentials ---');
    logger.info('Admin: admin@contractmanagement.com / Admin@123');
    logger.info('Procurement Manager: procurement@contractmanagement.com / Procurement@123');
    logger.info('Legal Counsel: legal@contractmanagement.com / Legal@123');
    logger.info('Contract Coordinator: coordinator@contractmanagement.com / Coordinator@123');
    logger.info('Client: john.doe@example.com / Client@123');
    logger.info('Client: jane.smith@example.com / Client@123');
    logger.info('Client: robert.wilson@example.com / Client@123');
    logger.info('Service Provider: tech.solutions@example.com / Provider@123');
    logger.info('Service Provider: data.experts@example.com / Provider@123');
    logger.info('Service Provider: office.pro@example.com / Provider@123');

    process.exit(0);
  } catch (error) {
    logger.error(`Seeding error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

seedData();
