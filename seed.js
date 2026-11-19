import "dotenv/config";
import { getCollections } from "./db.js";

const DAY = 24 * 60 * 60 * 1000;

const tutors = {
  rahim: { name: "Rahim Uddin", email: "rahim.tutor@example.com" },
  nusrat: { name: "Nusrat Jahan", email: "nusrat.tutor@example.com" },
  tanvir: { name: "Tanvir Ahmed", email: "tanvir.tutor@example.com" },
  sadia: { name: "Sadia Islam", email: "sadia.tutor@example.com" },
  imran: { name: "Imran Hossain", email: "imran.tutor@example.com" },
  farhana: { name: "Farhana Akter", email: "farhana.tutor@example.com" },
};

const items = [
  {
    title: "HSC Higher Math Complete Batch",
    subject: "Math",
    classLevel: "HSC",
    mode: "Offline",
    location: "Dhanmondi, Dhaka",
    monthlyFee: 2500,
    daysPerWeek: 3,
    description:
      "Complete HSC Higher Math course covering calculus, vectors and trigonometry with weekly model tests and doubt-solving sessions.",
    tutor: tutors.rahim,
  },
  {
    title: "SSC Physics Concept Builder",
    subject: "Physics",
    classLevel: "SSC",
    mode: "Online",
    location: "Zoom / Google Meet",
    monthlyFee: 1800,
    daysPerWeek: 3,
    description:
      "Concept-first SSC Physics classes with animations, numerical practice and recorded sessions for revision.",
    tutor: tutors.nusrat,
  },
  {
    title: "Programming Fundamentals with Python",
    subject: "Programming",
    classLevel: "University",
    mode: "Online",
    location: "Zoom",
    monthlyFee: 3000,
    daysPerWeek: 2,
    description:
      "Learn Python from scratch: variables, loops, functions, OOP and mini projects. Perfect for CSE first-year students.",
    tutor: tutors.tanvir,
  },
  {
    title: "IELTS Academic Preparation (Band 7+)",
    subject: "IELTS",
    classLevel: "Admission",
    mode: "Online",
    location: "Google Meet",
    monthlyFee: 4500,
    daysPerWeek: 4,
    description:
      "Four-skill IELTS training with mock tests, speaking practice and personal writing feedback.",
    tutor: tutors.sadia,
  },
  {
    title: "Class 8 Science and Math Care",
    subject: "Science",
    classLevel: "Class 8",
    mode: "Offline",
    location: "Mirpur 10, Dhaka",
    monthlyFee: 2000,
    daysPerWeek: 4,
    description:
      "Small-group home tuition for Class 8 with regular homework checking and monthly exams.",
    tutor: tutors.farhana,
  },
  {
    title: "HSC Chemistry Organic and Physical",
    subject: "Chemistry",
    classLevel: "HSC",
    mode: "Offline",
    location: "Uttara, Dhaka",
    monthlyFee: 2800,
    daysPerWeek: 3,
    description:
      "Chapter-wise HSC Chemistry batch with board question practice and lab-based explanations.",
    tutor: tutors.imran,
  },
  {
    title: "English Spoken and Grammar Basics",
    subject: "English",
    classLevel: "Class 9-10",
    mode: "Online",
    location: "Zoom",
    monthlyFee: 1500,
    daysPerWeek: 2,
    description:
      "Build confidence in spoken English and grammar with daily practice topics and friendly feedback.",
    tutor: tutors.sadia,
  },
  {
    title: "Web Development with HTML, CSS and JavaScript",
    subject: "Programming",
    classLevel: "Beginner",
    mode: "Online",
    location: "Google Meet",
    monthlyFee: 3500,
    daysPerWeek: 3,
    description:
      "Project-based web development course. Build a portfolio site, a to-do app and a small API-driven project.",
    tutor: tutors.tanvir,
  },
  {
    title: "SSC General Math One-to-One Mentorship",
    subject: "Math",
    classLevel: "SSC",
    mode: "Offline",
    location: "Mohammadpur, Dhaka",
    monthlyFee: 3200,
    daysPerWeek: 5,
    description:
      "Personalized 1-on-1 mentorship for SSC Math with a custom study plan and weekly progress reports.",
    tutor: tutors.rahim,
  },
  {
    title: "HSC Biology Smart Revision Batch",
    subject: "Biology",
    classLevel: "HSC",
    mode: "Online",
    location: "Google Meet",
    monthlyFee: 2200,
    daysPerWeek: 3,
    description:
      "Diagram-based Biology revision with MCQ drills, past-paper discussion and quick doubt support.",
    tutor: tutors.nusrat,
  },
  {
    title: "University Admission Physics and Math Crash Course",
    subject: "Physics",
    classLevel: "Admission",
    mode: "Offline",
    location: "Banani, Dhaka",
    monthlyFee: 4000,
    daysPerWeek: 5,
    description:
      "Intensive admission-focused course with daily practice sheets and full-length mock exams every weekend.",
    tutor: tutors.imran,
  },
  {
    title: "Class 6 to 8 Bangla and English Support",
    subject: "English",
    classLevel: "Class 6-8",
    mode: "Offline",
    location: "Chattogram Sadar",
    monthlyFee: 1600,
    daysPerWeek: 3,
    description:
      "Friendly language support classes focused on reading, writing and exam preparation for junior students.",
    tutor: tutors.farhana,
  },
];

const run = async () => {
  const { tuitions } = await getCollections();

  // আগের seed ডেটা মুছে ফেলা (আসল ডেটা অক্ষত থাকবে)
  await tuitions.deleteMany({ seeded: true });

  const docs = items.map((item, index) => {
    const { tutor, ...rest } = item;
    return {
      ...rest,
      bannerImage: `https://picsum.photos/seed/mentorlagbe${index + 1}/800/500`,
      tutorName: tutor.name,
      tutorEmail: tutor.email,
      approvalStatus: "approved",
      isActive: true,
      seeded: true,
      createdAt: new Date(Date.now() - index * DAY),
    };
  });

  const result = await tuitions.insertMany(docs);
  console.log(`Seeded ${result.insertedCount} tuitions`);
  process.exit(0);
};

run().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});