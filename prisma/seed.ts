import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  FileType,
  IdeaStatus,
  PrismaClient,
  ProjectStatus,
  Role,
  ScheduleType,
  VisitRating,
} from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed script.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const seedPassword = process.env.ADMIN_PASSWORD ?? '';
const department = 'Computer Science';

async function resetDatabase() {
  await prisma.discussionScheduleItemMember.deleteMany();
  await prisma.discussionScheduleItem.deleteMany();
  await prisma.discussionSchedule.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.projectCommitteeMember.deleteMany();
  await prisma.projectIdea.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.progressReport.deleteMany();
  await prisma.projectFile.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log('🌱 Seeding database...');

  await resetDatabase();
  const hashedPassword = await bcrypt.hash(seedPassword, 10);

  // ----- Users -----
  const head = await prisma.user.create({
    data: {
      name: 'Dr. Ahmed Mansour',
      email: 'head@example.com',
      password: hashedPassword,
      role: Role.HEAD,
      department,
      avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg',
    },
  });

  const [sara, tariq, mona, walid] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Dr. Sara Khalid',
        email: 'sara.khalid@example.com',
        password: hashedPassword,
        role: Role.SUPERVISOR,
        department,
        avatarUrl: 'https://randomuser.me/api/portraits/women/2.jpg',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dr. Tariq Hassan',
        email: 'tariq.hassan@example.com',
        password: hashedPassword,
        role: Role.SUPERVISOR,
        department,
        avatarUrl: 'https://randomuser.me/api/portraits/men/3.jpg',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dr. Mona Ibrahim',
        email: 'mona.ibrahim@example.com',
        password: hashedPassword,
        role: Role.SUPERVISOR,
        department,
        avatarUrl: 'https://randomuser.me/api/portraits/women/8.jpg',
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dr. Walid Nasser',
        email: 'walid.nasser@example.com',
        password: hashedPassword,
        role: Role.SUPERVISOR,
        department,
        avatarUrl: 'https://randomuser.me/api/portraits/men/9.jpg',
      },
    }),
  ]);

  const [lina, omar, nour, karim, hala, youssef, dina, fadi, rana, samer] =
    await Promise.all([
      prisma.user.create({
        data: {
          name: 'Lina Youssef',
          email: 'lina.youssef@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/women/4.jpg',
        },
      }),
      prisma.user.create({
        data: {
          name: 'Omar El-Sayed',
          email: 'omar.sayed@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/men/5.jpg',
        },
      }),
      prisma.user.create({
        data: {
          name: 'Nour Ali',
          email: 'nour.ali@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/women/6.jpg',
        },
      }),
      prisma.user.create({
        data: {
          name: 'Karim Nasser',
          email: 'karim.nasser@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/men/11.jpg',
        },
      }),
      prisma.user.create({
        data: {
          name: 'Hala Farouk',
          email: 'hala.farouk@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/women/12.jpg',
        },
      }),
      prisma.user.create({
        data: {
          name: 'Youssef Mahmoud',
          email: 'youssef.mahmoud@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/men/13.jpg',
        },
      }),
      prisma.user.create({
        data: {
          name: 'Dina Saleh',
          email: 'dina.saleh@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/women/14.jpg',
        },
      }),
      prisma.user.create({
        data: {
          name: 'Fadi Hassan',
          email: 'fadi.hassan@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/men/15.jpg',
        },
      }),
      prisma.user.create({
        data: {
          name: 'Rana Adel',
          email: 'rana.adel@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/women/16.jpg',
        },
      }),
      prisma.user.create({
        data: {
          name: 'Samer Qasim',
          email: 'samer.qasim@example.com',
          password: hashedPassword,
          role: Role.STUDENT,
          department,
          avatarUrl: 'https://randomuser.me/api/portraits/men/17.jpg',
        },
      }),
    ]);

  // ----- Projects (all statuses) -----
  const pendingProject = await prisma.project.create({
    data: {
      title: 'Intelligent Attendance System',
      description:
        'Face-recognition attendance for lecture halls with absence reports for the department head.',
      status: ProjectStatus.PENDING_APPROVAL,
      progress: 0,
      techStack: ['React', 'NestJS', 'OpenCV', 'PostgreSQL'],
      students: { connect: [{ id: dina.id }, { id: fadi.id }] },
    },
  });

  const approvedProject = await prisma.project.create({
    data: {
      title: 'AI-Powered Grading Assistant',
      description:
        'A web app that uses NLP to assist professors in grading essays and providing feedback.',
      status: ProjectStatus.APPROVED,
      progress: 15,
      techStack: ['React', 'Python', 'Flask', 'Hugging Face'],
      students: { connect: [{ id: lina.id }, { id: omar.id }] },
      supervisors: { connect: [{ id: sara.id }] },
    },
  });

  const inProgressProject = await prisma.project.create({
    data: {
      title: 'Smart Campus Navigation',
      description:
        'Mobile app with indoor mapping and real-time occupancy detection for university buildings.',
      status: ProjectStatus.IN_PROGRESS,
      progress: 70,
      techStack: ['Flutter', 'Firebase', 'TensorFlow Lite'],
      students: { connect: [{ id: nour.id }] },
      supervisors: { connect: [{ id: sara.id }, { id: tariq.id }] },
    },
  });

  const underReviewProject = await prisma.project.create({
    data: {
      title: 'Blockchain for Diploma Verification',
      description:
        'Decentralised system to issue and verify academic certificates using Ethereum.',
      status: ProjectStatus.UNDER_REVIEW,
      progress: 92,
      techStack: ['Solidity', 'Node.js', 'React', 'Web3.js'],
      students: { connect: [{ id: karim.id }, { id: hala.id }] },
      supervisors: { connect: [{ id: tariq.id }, { id: mona.id }] },
    },
  });

  const completedProject = await prisma.project.create({
    data: {
      title: 'Library Seat Booking System',
      description:
        'Real-time seat reservation for the university library with occupancy heatmaps.',
      status: ProjectStatus.COMPLETED,
      progress: 100,
      techStack: ['Next.js', 'NestJS', 'Redis', 'PostgreSQL'],
      students: { connect: [{ id: youssef.id }] },
      supervisors: { connect: [{ id: mona.id }] },
    },
  });

  const rejectedProject = await prisma.project.create({
    data: {
      title: 'VR Campus Tour',
      description:
        'Virtual-reality campus tour. Rejected because the scope exceeded one academic year.',
      status: ProjectStatus.REJECTED,
      progress: 5,
      techStack: ['Unity', 'C#', 'Blender'],
      students: { connect: [{ id: rana.id }, { id: samer.id }] },
      supervisors: { connect: [{ id: walid.id }] },
    },
  });

  // ----- Committees -----
  await prisma.projectCommitteeMember.createMany({
    data: [
      { projectId: inProgressProject.id, userId: mona.id },
      { projectId: inProgressProject.id, userId: walid.id },
      { projectId: underReviewProject.id, userId: sara.id },
      { projectId: underReviewProject.id, userId: walid.id },
      { projectId: underReviewProject.id, userId: head.id },
      { projectId: completedProject.id, userId: sara.id },
      { projectId: completedProject.id, userId: tariq.id },
      { projectId: completedProject.id, userId: walid.id },
    ],
  });

  // ----- Ideas -----
  await prisma.projectIdea.create({
    data: {
      title: 'AI-Powered Grading Assistant',
      description:
        'NLP pipeline that scores essays against a rubric and drafts instructor comments.',
      techStack: ['React', 'Python', 'Flask', 'Hugging Face'],
      status: IdeaStatus.TAKEN,
      department,
      proposedById: sara.id,
      claimedByProjectId: approvedProject.id,
    },
  });

  await prisma.projectIdea.create({
    data: {
      title: 'Smart Campus Navigation',
      description:
        'Indoor mapping with BLE beacons and live occupancy for lecture halls.',
      techStack: ['Flutter', 'Firebase', 'TensorFlow Lite'],
      status: IdeaStatus.TAKEN,
      department,
      proposedById: tariq.id,
      claimedByProjectId: inProgressProject.id,
    },
  });

  await prisma.projectIdea.createMany({
    data: [
      {
        title: 'E-Health Appointment System',
        description:
          'Clinic booking platform for students with doctor availability and SMS reminders.',
        techStack: ['React', 'NestJS', 'PostgreSQL'],
        status: IdeaStatus.AVAILABLE,
        department,
        proposedById: sara.id,
      },
      {
        title: 'Smart Waste Management',
        description:
          'IoT bins that report fill level and generate collection routes for campus facilities.',
        techStack: ['Arduino', 'MQTT', 'Node.js', 'React'],
        status: IdeaStatus.AVAILABLE,
        department,
        proposedById: tariq.id,
      },
      {
        title: 'Alumni Mentorship Portal',
        description:
          'Match graduating students with alumni mentors by specialty and career goal.',
        techStack: ['Next.js', 'Prisma', 'PostgreSQL'],
        status: IdeaStatus.AVAILABLE,
        department,
        proposedById: mona.id,
      },
      {
        title: 'Registration Chatbot',
        description:
          'Legacy chatbot for course registration FAQs. Archived after the SIS upgrade.',
        techStack: ['Dialogflow', 'Node.js'],
        status: IdeaStatus.ARCHIVED,
        department,
        proposedById: walid.id,
      },
    ],
  });

  // ----- Project files -----
  await prisma.projectFile.createMany({
    data: [
      {
        projectId: approvedProject.id,
        type: FileType.PROPOSAL,
        url: 'https://example.com/files/grading_proposal.pdf',
        filename: 'AI_Grading_Proposal.pdf',
        size: 245000,
      },
      {
        projectId: inProgressProject.id,
        type: FileType.PROPOSAL,
        url: 'https://example.com/files/navigation_proposal.pdf',
        filename: 'Smart_Navigation_Proposal.pdf',
        size: 310000,
      },
      {
        projectId: inProgressProject.id,
        type: FileType.PROGRESS_REPORT,
        url: 'https://example.com/files/navigation_week8.pdf',
        filename: 'progress_week8.pdf',
        size: 128000,
      },
      {
        projectId: inProgressProject.id,
        type: FileType.PRESENTATION,
        url: 'https://example.com/files/navigation_midterm.pptx',
        filename: 'midterm_presentation.pptx',
        size: 5600000,
      },
      {
        projectId: underReviewProject.id,
        type: FileType.PROPOSAL,
        url: 'https://example.com/files/blockchain_proposal.pdf',
        filename: 'Blockchain_Diploma_Proposal.pdf',
        size: 189000,
      },
      {
        projectId: underReviewProject.id,
        type: FileType.FINAL_REPORT,
        url: 'https://example.com/files/blockchain_final.pdf',
        filename: 'Blockchain_Final_Report.pdf',
        size: 2400000,
      },
      {
        projectId: completedProject.id,
        type: FileType.FINAL_REPORT,
        url: 'https://example.com/files/library_final.pdf',
        filename: 'Library_Booking_Final.pdf',
        size: 1800000,
      },
      {
        projectId: completedProject.id,
        type: FileType.PRESENTATION,
        url: 'https://example.com/files/library_defense.pptx',
        filename: 'defense_slides.pptx',
        size: 4200000,
      },
      {
        projectId: pendingProject.id,
        type: FileType.PROPOSAL,
        url: 'https://example.com/files/attendance_proposal.pdf',
        filename: 'Attendance_Proposal.pdf',
        size: 156000,
      },
      {
        projectId: rejectedProject.id,
        type: FileType.OTHER,
        url: 'https://example.com/files/vr_scope.docx',
        filename: 'VR_Scope_Notes.docx',
        size: 42000,
      },
    ],
  });

  // ----- Progress reports -----
  await prisma.progressReport.createMany({
    data: [
      {
        projectId: approvedProject.id,
        authorId: lina.id,
        content:
          'Collected sample essays and drafted the scoring rubric with Dr. Sara.',
        weekNumber: 1,
      },
      {
        projectId: inProgressProject.id,
        authorId: nour.id,
        content:
          'Completed BLE beacon integration. Mapping interface ready for testing.',
        weekNumber: 5,
      },
      {
        projectId: inProgressProject.id,
        authorId: nour.id,
        content:
          'Indoor routing works on two floors. Occupancy heatmap still noisy.',
        weekNumber: 8,
      },
      {
        projectId: underReviewProject.id,
        authorId: karim.id,
        content:
          'Smart contract deployed on Sepolia. Certificate issuance demo is ready.',
        weekNumber: 12,
      },
      {
        projectId: underReviewProject.id,
        authorId: hala.id,
        content:
          'Verifier UI finished. Waiting for committee comments before defense.',
        weekNumber: 13,
      },
      {
        projectId: completedProject.id,
        authorId: youssef.id,
        content:
          'Final load test passed. Documentation and user guide submitted.',
        weekNumber: 14,
      },
    ],
  });

  // ----- Comments -----
  await prisma.comment.createMany({
    data: [
      {
        projectId: approvedProject.id,
        authorId: sara.id,
        content:
          'Good start. Use a pre-trained model before training from scratch.',
      },
      {
        projectId: approvedProject.id,
        authorId: head.id,
        content: 'Please ensure you comply with data privacy regulations.',
      },
      {
        projectId: inProgressProject.id,
        authorId: tariq.id,
        content: 'The mapping UI looks clean. Add a floor selector.',
      },
      {
        projectId: underReviewProject.id,
        authorId: sara.id,
        content: 'Gas costs look reasonable. Prepare a fallback if the RPC fails.',
      },
      {
        projectId: completedProject.id,
        authorId: mona.id,
        content: 'Excellent delivery. Ready for the archive.',
      },
      {
        projectId: pendingProject.id,
        authorId: head.id,
        content: 'Clarify the ethics approval for storing student face data.',
      },
      {
        projectId: rejectedProject.id,
        authorId: walid.id,
        content: 'Scope is too large for one year. Please submit a narrower proposal.',
      },
    ],
  });

  // ----- Meetings -----
  await prisma.meeting.createMany({
    data: [
      {
        projectId: approvedProject.id,
        scheduledById: sara.id,
        scheduledAt: new Date('2026-09-02T10:00:00Z'),
        location: 'Zoom link: https://zoom.us/j/123456789',
        notes: 'Kickoff: rubric, dataset, and first sprint plan.',
      },
      {
        projectId: inProgressProject.id,
        scheduledById: tariq.id,
        scheduledAt: new Date('2026-08-28T14:30:00Z'),
        location: 'Room 302, Engineering Building',
        notes: 'Test navigation on different devices.',
      },
      {
        projectId: underReviewProject.id,
        scheduledById: mona.id,
        scheduledAt: new Date('2026-08-25T09:15:00Z'),
        location: 'Google Meet: meet.google.com/abc-defg-hij',
        notes: 'Pre-defense rehearsal of the smart-contract demo.',
      },
      {
        projectId: completedProject.id,
        scheduledById: youssef.id,
        scheduledAt: new Date('2026-06-10T11:00:00Z'),
        location: 'Room 204, Computer Science',
        notes: 'Final handover and archive checklist.',
      },
    ],
  });

  // ----- Visits -----
  await prisma.visit.createMany({
    data: [
      {
        projectId: inProgressProject.id,
        studentId: nour.id,
        supervisorId: sara.id,
        visitedAt: new Date('2026-07-12T11:00:00Z'),
        summary: 'Reviewed indoor routing prototype on the engineering building map.',
        evaluation: 'Strong demo. Floor switching still needs polish.',
        rating: VisitRating.GOOD,
      },
      {
        projectId: inProgressProject.id,
        studentId: nour.id,
        supervisorId: tariq.id,
        visitedAt: new Date('2026-08-04T13:00:00Z'),
        summary: 'Checked occupancy heatmap against live lecture-hall counts.',
        evaluation: 'Accuracy improved. Ready for midterm seminar.',
        rating: VisitRating.EXCELLENT,
      },
      {
        projectId: underReviewProject.id,
        studentId: karim.id,
        supervisorId: tariq.id,
        visitedAt: new Date('2026-07-20T10:30:00Z'),
        summary: 'Walked through certificate issuance on the Sepolia testnet.',
        evaluation: 'Contract is solid. Document the admin key rotation.',
        rating: VisitRating.GOOD,
      },
      {
        projectId: underReviewProject.id,
        studentId: hala.id,
        supervisorId: mona.id,
        visitedAt: new Date('2026-08-01T12:00:00Z'),
        summary: 'Reviewed verifier UI and accessibility of the public lookup page.',
        evaluation: 'UI is usable. Add empty-state copy for invalid hashes.',
        rating: VisitRating.FAIR,
      },
      {
        projectId: completedProject.id,
        studentId: youssef.id,
        supervisorId: mona.id,
        visitedAt: new Date('2026-05-18T09:00:00Z'),
        summary: 'Final lab visit before the discussion. Load test results reviewed.',
        evaluation: 'Complete work with clear documentation.',
        rating: VisitRating.EXCELLENT,
      },
      {
        projectId: approvedProject.id,
        studentId: lina.id,
        supervisorId: sara.id,
        visitedAt: new Date('2026-08-15T10:00:00Z'),
        summary: 'First visit after approval. Dataset collection plan agreed.',
        evaluation: 'Need a clearer privacy consent form before collecting essays.',
        rating: VisitRating.POOR,
      },
    ],
  });

  // ----- Discussion schedules -----
  const finalSchedule = await prisma.discussionSchedule.create({
    data: {
      title: 'Final Discussions 2025/2026',
      type: ScheduleType.FINAL_DISCUSSION,
      academicYear: '2025/2026',
      semester: 'Spring',
      discussionDate: new Date('2026-06-15T00:00:00Z'),
      department,
      location: 'Hall A, Computer Science Building',
      chairName: head.name,
      createdById: head.id,
      items: {
        create: [
          {
            projectId: completedProject.id,
            slotOrder: 1,
            projectTitle: completedProject.title,
            studentNames: [youssef.name],
            supervisorNames: [mona.name],
            committeeNames: [sara.name, tariq.name, walid.name],
            startsAt: new Date('2026-06-15T09:00:00Z'),
            endsAt: new Date('2026-06-15T09:40:00Z'),
            room: 'Hall A-1',
            notes: 'Completed project. Archive after discussion.',
            committeeMembers: {
              create: [
                { userId: sara.id },
                { userId: tariq.id },
                { userId: walid.id },
              ],
            },
          },
          {
            projectId: underReviewProject.id,
            slotOrder: 2,
            projectTitle: underReviewProject.title,
            studentNames: [karim.name, hala.name],
            supervisorNames: [tariq.name, mona.name],
            committeeNames: [sara.name, walid.name, head.name],
            startsAt: new Date('2026-06-15T09:50:00Z'),
            endsAt: new Date('2026-06-15T10:30:00Z'),
            room: 'Hall A-1',
            notes: 'Bring a live Sepolia demo and a recorded fallback.',
            committeeMembers: {
              create: [
                { userId: sara.id },
                { userId: walid.id },
                { userId: head.id },
              ],
            },
          },
        ],
      },
    },
  });

  const seminarSchedule = await prisma.discussionSchedule.create({
    data: {
      title: 'Midterm Seminars 2026/2027',
      type: ScheduleType.SEMINAR,
      academicYear: '2026/2027',
      semester: 'Fall',
      discussionDate: new Date('2026-10-20T00:00:00Z'),
      department,
      location: 'Seminar Room 2',
      chairName: head.name,
      createdById: head.id,
      items: {
        create: [
          {
            projectId: inProgressProject.id,
            slotOrder: 1,
            projectTitle: inProgressProject.title,
            studentNames: [nour.name],
            supervisorNames: [sara.name, tariq.name],
            committeeNames: [mona.name, walid.name],
            startsAt: new Date('2026-10-20T11:00:00Z'),
            endsAt: new Date('2026-10-20T11:25:00Z'),
            room: 'SR-2',
            notes: 'Focus on occupancy accuracy and demo reliability.',
            committeeMembers: {
              create: [{ userId: mona.id }, { userId: walid.id }],
            },
          },
          {
            projectId: approvedProject.id,
            slotOrder: 2,
            projectTitle: approvedProject.title,
            studentNames: [lina.name, omar.name],
            supervisorNames: [sara.name],
            committeeNames: [tariq.name, mona.name],
            startsAt: new Date('2026-10-20T11:30:00Z'),
            endsAt: new Date('2026-10-20T11:55:00Z'),
            room: 'SR-2',
            notes: 'Present the rubric and a first grading sample.',
            committeeMembers: {
              create: [{ userId: tariq.id }, { userId: mona.id }],
            },
          },
        ],
      },
    },
  });

  // ----- Notifications -----
  await prisma.notification.createMany({
    data: [
      {
        userId: dina.id,
        message: `Your project "${pendingProject.title}" is pending department-head approval.`,
        link: `/projects/${pendingProject.id}`,
        isRead: false,
      },
      {
        userId: head.id,
        message: `A new project (${pendingProject.title}) is pending your approval.`,
        link: `/projects/${pendingProject.id}`,
        isRead: false,
      },
      {
        userId: lina.id,
        message: `Your project "${approvedProject.title}" has been approved.`,
        link: `/projects/${approvedProject.id}`,
        isRead: false,
      },
      {
        userId: nour.id,
        message: 'A new visit was recorded for project "Smart Campus Navigation".',
        link: `/projects/${inProgressProject.id}`,
        isRead: false,
      },
      {
        userId: sara.id,
        message: 'Student Nour Ali submitted a progress report.',
        link: `/projects/${inProgressProject.id}`,
        isRead: false,
      },
      {
        userId: karim.id,
        message: `You are scheduled in "${finalSchedule.title}".`,
        link: '/discussion-schedules',
        isRead: false,
      },
      {
        userId: hala.id,
        message: `You are scheduled in "${finalSchedule.title}".`,
        link: '/discussion-schedules',
        isRead: true,
      },
      {
        userId: youssef.id,
        message: `Project "${completedProject.title}" was marked completed.`,
        link: `/projects/${completedProject.id}`,
        isRead: true,
      },
      {
        userId: rana.id,
        message: `Your project "${rejectedProject.title}" was rejected.`,
        link: `/projects/${rejectedProject.id}`,
        isRead: false,
      },
      {
        userId: omar.id,
        message: `You are scheduled in "${seminarSchedule.title}".`,
        link: '/discussion-schedules',
        isRead: false,
      },
    ],
  });

  console.log('✅ Seeding completed!');
  console.log('');
  console.log('Login accounts (password for all):', seedPassword);
  console.log('  HEAD        head@example.com');
  console.log('  SUPERVISOR  sara.khalid@example.com');
  console.log('  SUPERVISOR  tariq.hassan@example.com');
  console.log('  SUPERVISOR  mona.ibrahim@example.com');
  console.log('  SUPERVISOR  walid.nasser@example.com');
  console.log('  STUDENT     lina.youssef@example.com');
  console.log('  STUDENT     omar.sayed@example.com');
  console.log('  STUDENT     nour.ali@example.com');
  console.log('  STUDENT     karim.nasser@example.com');
  console.log('  STUDENT     hala.farouk@example.com');
  console.log('  STUDENT     youssef.mahmoud@example.com');
  console.log('  STUDENT     dina.saleh@example.com');
  console.log('  STUDENT     fadi.hassan@example.com');
  console.log('  STUDENT     rana.adel@example.com');
  console.log('  STUDENT     samer.qasim@example.com');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
