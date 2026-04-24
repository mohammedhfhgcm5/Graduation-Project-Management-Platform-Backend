import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, ProjectStatus, FileType } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed script.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log('🌱 Seeding database...');

  // ----- Create Users -----
  const head = await prisma.user.create({
    data: {
      name: 'Dr. Ahmed Mansour',
      email: 'head@example.com',
      password: '$2a$10$hashedpassword123', // In real app, use bcrypt hash
      role: Role.HEAD,
      department: 'Computer Science',
      avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
    },
  });

  const supervisor1 = await prisma.user.create({
    data: {
      name: 'Dr. Sara Khalid',
      email: 'sara.khalid@example.com',
      password: '$2a$10$hashedpassword123',
      role: Role.SUPERVISOR,
      department: 'Software Engineering',
      avatarUrl: 'https://randomuser.me/api/portraits/women/2.jpg',
    },
  });

  const supervisor2 = await prisma.user.create({
    data: {
      name: 'Dr. Tariq Hassan',
      email: 'tariq.hassan@example.com',
      password: '$2a$10$hashedpassword123',
      role: Role.SUPERVISOR,
      department: 'Data Science',
      avatarUrl: 'https://randomuser.me/api/portraits/men/3.jpg',
    },
  });

  const student1 = await prisma.user.create({
    data: {
      name: 'Lina Youssef',
      email: 'lina.youssef@example.com',
      password: '$2a$10$hashedpassword123',
      role: Role.STUDENT,
      department: 'Computer Science',
      avatarUrl: 'https://randomuser.me/api/portraits/women/4.jpg',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      name: 'Omar El-Sayed',
      email: 'omar.sayed@example.com',
      password: '$2a$10$hashedpassword123',
      role: Role.STUDENT,
      department: 'Information Systems',
      avatarUrl: 'https://randomuser.me/api/portraits/men/5.jpg',
    },
  });

  const student3 = await prisma.user.create({
    data: {
      name: 'Nour Ali',
      email: 'nour.ali@example.com',
      password: '$2a$10$hashedpassword123',
      role: Role.STUDENT,
      department: 'Computer Science',
      avatarUrl: 'https://randomuser.me/api/portraits/women/6.jpg',
    },
  });

  // ----- Create Projects -----
  const project1 = await prisma.project.create({
    data: {
      title: 'AI-Powered Grading Assistant',
      description: 'A web app that uses NLP to assist professors in grading essays and providing feedback.',
      status: ProjectStatus.APPROVED,
      progress: 45,
      techStack: ['React', 'Python', 'Flask', 'Hugging Face'],
      students: {
        connect: [{ id: student1.id }, { id: student2.id }],
      },
      supervisors: {
        connect: [{ id: supervisor1.id }],
      },
    },
  });

  const project2 = await prisma.project.create({
    data: {
      title: 'Smart Campus Navigation',
      description: 'Mobile app with indoor mapping and real-time occupancy detection for university buildings.',
      status: ProjectStatus.IN_PROGRESS,
      progress: 70,
      techStack: ['Flutter', 'Firebase', 'TensorFlow Lite'],
      students: {
        connect: [{ id: student3.id }],
      },
      supervisors: {
        connect: [{ id: supervisor1.id }, { id: supervisor2.id }],
      },
    },
  });

  const project3 = await prisma.project.create({
    data: {
      title: 'Blockchain for Diploma Verification',
      description: 'Decentralised system to issue and verify academic certificates using Ethereum.',
      status: ProjectStatus.APPROVED,
      progress: 10,
      techStack: ['Solidity', 'Node.js', 'React', 'Web3.js'],
      students: {
        connect: [
          { id: student1.id },
          { id: student2.id },
          { id: student3.id },
        ],
      },
      supervisors: {
        connect: [{ id: supervisor1.id }, { id: supervisor2.id }],
      },
    },
  });

  // ----- Project Files -----
  await prisma.projectFile.createMany({
    data: [
      {
        projectId: project1.id,
        type: FileType.PROPOSAL,
        url: 'https://example.com/files/project1_proposal.pdf',
        filename: 'AI_Grading_Proposal.pdf',
        size: 245000,
      },
      {
        projectId: project1.id,
        type: FileType.PROGRESS_REPORT,
        url: 'https://example.com/files/project1_progress_week3.pdf',
        filename: 'progress_week3.pdf',
        size: 128000,
      },
      {
        projectId: project2.id,
        type: FileType.PROPOSAL,
        url: 'https://example.com/files/project2_proposal.pdf',
        filename: 'Smart_Navigation_Proposal.pdf',
        size: 310000,
      },
      {
        projectId: project2.id,
        type: FileType.PRESENTATION,
        url: 'https://example.com/files/project2_slides.pptx',
        filename: 'midterm_presentation.pptx',
        size: 5600000,
      },
      {
        projectId: project3.id,
        type: FileType.PROPOSAL,
        url: 'https://example.com/files/project3_proposal.pdf',
        filename: 'Blockchain_Diploma_Proposal.pdf',
        size: 189000,
      },
    ],
  });

  // ----- Progress Reports -----
  await prisma.progressReport.createMany({
    data: [
      {
        projectId: project1.id,
        authorId: student1.id,
        content: 'Implemented basic tokenisation and sentiment analysis module. Accuracy currently at 78%.',
        weekNumber: 3,
      },
      {
        projectId: project1.id,
        authorId: student1.id,
        content: 'Integrated feedback generation API. Need to work on rubric alignment.',
        weekNumber: 4,
      },
      {
        projectId: project2.id,
        authorId: student2.id,
        content: 'Completed BLE beacon integration. Mapping interface ready for testing.',
        weekNumber: 5,
      },
      {
        projectId: project3.id,
        authorId: student3.id,
        content: 'Wrote smart contract for certificate issuance. Deployed on testnet.',
        weekNumber: 2,
      },
    ],
  });

  // ----- Comments -----
  await prisma.comment.createMany({
    data: [
      {
        projectId: project1.id,
        authorId: supervisor1.id,
        content: 'Good progress. Consider using a pre-trained model to improve accuracy.',
      },
      {
        projectId: project1.id,
        authorId: head.id,
        content: 'Please ensure you comply with data privacy regulations.',
      },
      {
        projectId: project2.id,
        authorId: supervisor2.id,
        content: 'The mapping UI looks clean. Add a floor selector.',
      },
      {
        projectId: project3.id,
        authorId: supervisor1.id,
        content: 'Great start. Let’s review gas costs optimisation next meeting.',
      },
    ],
  });

  // ----- Meetings -----
  await prisma.meeting.createMany({
    data: [
      {
        projectId: project1.id,
        scheduledById: supervisor1.id,
        scheduledAt: new Date('2025-04-15T10:00:00Z'),
        location: 'Zoom link: https://zoom.us/j/123456789',
        notes: 'Discuss finalising the grading rubric and UI mockups.',
      },
      {
        projectId: project2.id,
        scheduledById: supervisor2.id,
        scheduledAt: new Date('2025-04-18T14:30:00Z'),
        location: 'Room 302, Engineering Building',
        notes: 'Test the navigation on different devices.',
      },
      {
        projectId: project3.id,
        scheduledById: student3.id,
        scheduledAt: new Date('2025-04-20T09:15:00Z'),
        location: 'Google Meet: meet.google.com/abc-defg-hij',
        notes: 'Prepare demo of the smart contract interaction.',
      },
    ],
  });

  // ----- Notifications -----
  await prisma.notification.createMany({
    data: [
      {
        userId: student1.id,
        message: 'Your project "AI-Powered Grading Assistant" has been approved.',
        link: '/projects/' + project1.id,
        isRead: false,
      },
      {
        userId: student2.id,
        message: 'New comment from your supervisor on Smart Campus Navigation.',
        link: '/projects/' + project2.id,
        isRead: true,
      },
      {
        userId: supervisor1.id,
        message: 'Student Lina Youssef submitted a progress report.',
        link: '/projects/' + project1.id,
        isRead: false,
      },
      {
        userId: head.id,
        message: 'A new project (Blockchain for Diploma Verification) is pending your approval.',
        link: '/projects/' + project3.id,
        isRead: false,
      },
      {
        userId: student3.id,
        message: 'Meeting scheduled for April 20 at 09:15.',
        link: '/projects/' + project3.id,
        isRead: false,
      },
    ],
  });

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
