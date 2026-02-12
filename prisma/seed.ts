import { PrismaClient, Pillar, Tone } from "@prisma/client";

const prisma = new PrismaClient();

const templates = [
  {
    name: "Brotherhood Ride Story - Leader",
    pillar: Pillar.BROTHERHOOD,
    tone: Tone.LEADER,
    templateText: `You are writing a Facebook post for Swift the Great — a Dallas-based motorcycle set leader, entrepreneur, and cultural voice.
Write about brotherhood in motorcycle culture — the code, the respect, the bond between riders.
Tone: Calm authority, leadership presence, respect-driven.
Voice: Confident, modern, smooth. Not corny. Short punchy lines.
Optional signature lines (use sparingly): "Ride with purpose." / "Legacy over noise." / "Brotherhood. Business. Balance."
Keep hashtags to 3-8 max. Encourage engagement with a thoughtful question.`,
  },
  {
    name: "Brotherhood Humor",
    pillar: Pillar.BROTHERHOOD,
    tone: Tone.FUNNY,
    templateText: `You are writing a Facebook post for Swift the Great — Dallas motorcycle culture icon and entrepreneur.
Write a funny/relatable post about motorcycle set life — the clubhouse stories, the inside jokes, the ride-or-die moments.
Tone: Witty, humorous, relatable. Think barbershop banter meets biker culture.
Voice: Confident, playful swagger. "I'm him" energy but never forced.
Keep it light but real. 3-8 hashtags max. End with something that makes people tag a friend or drop a comment.`,
  },
  {
    name: "Leadership Motivation",
    pillar: Pillar.LEADERSHIP,
    tone: Tone.LEADER,
    templateText: `You are writing a Facebook post for Swift the Great — a leader who embodies calm authority and legacy mindset.
Write about leadership, discipline, and what it means to lead by example.
Tone: Authoritative but approachable. Think mentor energy, not preacher.
Voice: Confident, direct, modern. Short powerful statements.
Optional signature: "The Swift Era is upon us." / "Better adjust accordingly."
3-8 hashtags max. End with something that sparks reflection or comments.`,
  },
  {
    name: "Leadership Reflective",
    pillar: Pillar.LEADERSHIP,
    tone: Tone.REFLECTIVE,
    templateText: `You are writing a Facebook post for Swift the Great — a man of purpose who leads with intention.
Write a reflective post about legacy, growth, and the quiet strength of real leadership.
Tone: Thoughtful, grounded, inspiring without being preachy.
Voice: Smooth, wise, measured. Like a conversation at sunset after a long ride.
3-8 hashtags max. End with a question that makes people think.`,
  },
  {
    name: "Humor & Culture - Funny",
    pillar: Pillar.HUMOR,
    tone: Tone.FUNNY,
    templateText: `You are writing a Facebook post for Swift the Great — Dallas culture, R&B nostalgia, and relatable humor.
Write something funny and culturally relevant — R&B references, Dallas vibes, everyday relatability.
Tone: Hilarious, witty, culturally sharp. Think tweet energy on Facebook.
Voice: Swift's signature playful confidence. "I'm him. Argue with your auntie." energy.
Keep it clean but edgy. 3-8 hashtags max. Make people laugh AND engage.`,
  },
  {
    name: "Humor Clubhouse Style",
    pillar: Pillar.HUMOR,
    tone: Tone.CLUBHOUSE,
    templateText: `You are writing a Facebook post for Swift the Great — motorcycle set life meets comedy.
Write a clubhouse-style funny post — the stories, the characters, the moments that only set life people understand.
Tone: Storytelling humor. Like you're at the clubhouse and someone just said something wild.
Voice: Animated, authentic, Swift's natural charisma.
3-8 hashtags max. End with something that makes people share their own stories.`,
  },
  {
    name: "Entrepreneurship Builder",
    pillar: Pillar.ENTREPRENEURSHIP,
    tone: Tone.BUILDER,
    templateText: `You are writing a Facebook post for Swift the Great — tech boss, AI enthusiast, business builder.
Write about entrepreneurship, AI, apps, automation, or building systems.
Tone: Hustle with purpose. Not grindset cringe — strategic builder energy.
Voice: Confident, forward-thinking, practical wisdom. Like a CEO who also rides motorcycles.
Optional signature: "Legacy over noise." / "Brotherhood. Business. Balance."
3-8 hashtags max. Encourage engagement.`,
  },
  {
    name: "Entrepreneurship Leader",
    pillar: Pillar.ENTREPRENEURSHIP,
    tone: Tone.LEADER,
    templateText: `You are writing a Facebook post for Swift the Great — a leader in both business and community.
Write about business building, financial discipline, or creating opportunities for others.
Tone: Authoritative entrepreneur. Mentor meets mogul.
Voice: Direct, no-fluff, inspiring through action not just words.
3-8 hashtags max. End with a call to action or reflective question.`,
  },
  {
    name: "Family Legacy",
    pillar: Pillar.FAMILY,
    tone: Tone.REFLECTIVE,
    templateText: `You are writing a Facebook post for Swift the Great — a father, a man of values, a legacy builder.
Write about fatherhood, manhood, family values, or building something that outlasts you.
Tone: Warm, grounded, real. Vulnerability meets strength.
Voice: Authentic, from the heart but not sappy. Swift's signature blend of tough and tender.
3-8 hashtags max. End with something that resonates with parents and builders.`,
  },
  {
    name: "Family Builder",
    pillar: Pillar.FAMILY,
    tone: Tone.BUILDER,
    templateText: `You are writing a Facebook post for Swift the Great — a man building legacy through family and business.
Write about the intersection of family life and building an empire — the balance, the sacrifices, the purpose.
Tone: Grounded hustle. Family-first but still building.
Voice: Real talk, no pretense. Like advice from an OG uncle who actually made it.
3-8 hashtags max. Encourage others to share their own journey.`,
  },
  {
    name: "Clubhouse Brotherhood",
    pillar: Pillar.BROTHERHOOD,
    tone: Tone.CLUBHOUSE,
    templateText: `You are writing a Facebook post for Swift the Great — set life, clubhouse energy, real biker culture.
Write a post that captures the energy of the clubhouse — the camaraderie, the rituals, the unspoken code.
Tone: Authentic set-life energy. The real side of motorcycle culture.
Voice: Direct, experienced, insider perspective. Not for tourists.
3-8 hashtags max. Write something that makes real ones nod and outsiders curious.`,
  },
  {
    name: "Leadership Builder",
    pillar: Pillar.LEADERSHIP,
    tone: Tone.BUILDER,
    templateText: `You are writing a Facebook post for Swift the Great — building leaders, not followers.
Write about developing others, creating systems of growth, or the builder's approach to leadership.
Tone: Strategic, forward-thinking, empowering.
Voice: CEO energy. Confident, direct, results-oriented but people-focused.
Optional signature: "The Swift Era is upon us." / "Better adjust accordingly."
3-8 hashtags max. End with a challenge or call to action.`,
  },
];

async function main() {
  console.log("Seeding database...");

  // Upsert default settings
  const existingSettings = await prisma.setting.findFirst();
  if (!existingSettings) {
    await prisma.setting.create({
      data: {
        requireApproval: true,
        autoPostEnabled: false,
        dailyPostTarget: 8,
        strictMode: true,
        blockedWords: "",
      },
    });
    console.log("Created default settings");
  }

  // Seed prompt templates
  for (const tpl of templates) {
    const existing = await prisma.promptTemplate.findFirst({
      where: { name: tpl.name },
    });
    if (!existing) {
      await prisma.promptTemplate.create({ data: tpl });
      console.log(`Created template: ${tpl.name}`);
    }
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
