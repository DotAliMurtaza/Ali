import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

interface GitHubRepoSnapshot {
  slug: string;
  title: string;
  category: 'game' | 'website';
  repoOwner: string;
  repoName: string;
  requestedRef?: string;
  htmlUrl: string;
  homepageUrl: string;
  description: string;
  primaryLanguage: string;
  languages: string[];
  stars: number;
  updatedAt: string;
}

const VERIFIED_REPO_BASE: GitHubRepoSnapshot[] = [
  {
    slug: 'car-game',
    title: 'Car Game — Apex Racer',
    category: 'game',
    repoOwner: 'DotAliMurtaza',
    repoName: 'car-game',
    htmlUrl: 'https://github.com/DotAliMurtaza/car-game',
    homepageUrl: 'https://car-game-virid-six.vercel.app',
    description:
      'Fast-paced arcade car racing game featuring multiple difficulty levels, responsive touch and keyboard controls, and smooth animation.',
    primaryLanguage: 'TypeScript',
    languages: ['TypeScript', 'React', 'Tailwind CSS', 'Motion'],
    stars: 1,
    updatedAt: '2026-09-20T00:00:00Z',
  },
  {
    slug: 'ludo-king',
    title: 'Ludo King — Ludo 3D Realm',
    category: 'game',
    repoOwner: 'DotAliMurtaza',
    repoName: 'ludo-king',
    htmlUrl: 'https://github.com/DotAliMurtaza/ludo-king',
    homepageUrl: 'https://ludokingmurtaza.vercel.app',
    description:
      'Interactive 3D Ludo board game with smooth turn-based gameplay, sound effects, responsive layout, and intelligent bot opponents.',
    primaryLanguage: 'TypeScript',
    languages: ['TypeScript', 'React', 'Tailwind CSS', 'Canvas Confetti'],
    stars: 1,
    updatedAt: '2026-09-22T00:00:00Z',
  },
  {
    slug: 'tom-gold-run-',
    title: 'Tom Gold Run 3D',
    category: 'game',
    repoOwner: 'DotAliMurtaza',
    repoName: 'tom-gold-run-',
    htmlUrl: 'https://github.com/DotAliMurtaza/tom-gold-run-',
    homepageUrl: 'https://tomgoldrun.vercel.app',
    description:
      'Three.js 3D endless-runner game with character selection, oncoming train and car obstacles, gold collection, and pass-and-play modes.',
    primaryLanguage: 'TypeScript',
    languages: ['TypeScript', 'Three.js', 'React', 'Tailwind CSS'],
    stars: 1,
    updatedAt: '2026-09-24T00:00:00Z',
  },
  {
    slug: 'shoes',
    title: 'Shoes Website — AeroSole',
    category: 'website',
    repoOwner: 'DotAliMurtaza',
    repoName: 'shoes',
    requestedRef: 'github.com/muhammadshoaibkhan607-png/shoes (redirects to DotAliMurtaza/shoes)',
    htmlUrl: 'https://github.com/DotAliMurtaza/shoes',
    homepageUrl: 'https://shoes-five-nu.vercel.app',
    description:
      'Modern footwear e-commerce storefront featuring interactive sizing, wishlist management, real-time shopping cart, and seamless checkout flow.',
    primaryLanguage: 'TypeScript',
    languages: ['TypeScript', 'React', 'Tailwind CSS', 'Context API'],
    stars: 0,
    updatedAt: '2026-09-18T00:00:00Z',
  },
  {
    slug: 'uniq-glasses',
    title: 'Unique Glasses — LUMOS Atelier',
    category: 'website',
    repoOwner: 'DotAliMurtaza',
    repoName: 'uniq-glasses',
    requestedRef:
      'github.com/muhammadshoaibkhan607-png/uniq-glasses (redirects to DotAliMurtaza/uniq-glasses)',
    htmlUrl: 'https://github.com/DotAliMurtaza/uniq-glasses',
    homepageUrl: 'https://aliglasses.vercel.app',
    description:
      'Handcrafted eyewear and sunglasses showcase with curated frame collections, optical specifications, and interactive product browsing.',
    primaryLanguage: 'TypeScript',
    languages: ['TypeScript', 'React', 'Tailwind CSS', 'Motion'],
    stars: 0,
    updatedAt: '2026-09-19T00:00:00Z',
  },
  {
    slug: 'Ali-fragrance',
    title: 'Ali Fragrance Website',
    category: 'website',
    repoOwner: 'DotAliMurtaza',
    repoName: 'Ali-fragrance',
    requestedRef:
      'github.com/muhammadshoaibkhan607-png/Ali-fragrance (redirects to DotAliMurtaza/Ali-fragrance)',
    htmlUrl: 'https://github.com/DotAliMurtaza/Ali-fragrance',
    homepageUrl: 'https://ali-fragrance-five.vercel.app',
    description:
      'Luxury fragrance and perfumery storefront crafted with editorial product pages, scent note explorers, and responsive shopping bag controls.',
    primaryLanguage: 'TypeScript',
    languages: ['TypeScript', 'React', 'Tailwind CSS', 'Motion'],
    stars: 0,
    updatedAt: '2026-09-25T00:00:00Z',
  },
];

let githubCache: {
  expiresAt: number;
  profile: { login: string; avatarUrl: string; htmlUrl: string; publicRepos: number; bio: string };
  projects: GitHubRepoSnapshot[];
  source: 'live' | 'verified-fallback';
} | null = null;

async function fetchGitHubPortfolioData() {
  if (githubCache && Date.now() < githubCache.expiresAt) {
    return githubCache;
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'Ali-Murtaza-Portfolio-App',
  };

  try {
    const userRes = await fetch('https://api.github.com/users/DotAliMurtaza', { headers });
    if (!userRes.ok) {
      throw new Error(`GitHub user API returned ${userRes.status}`);
    }
    const userJson = (await userRes.json()) as {
      login?: string;
      avatar_url?: string;
      html_url?: string;
      public_repos?: number;
      bio?: string;
    };

    const repoResults = await Promise.all(
      VERIFIED_REPO_BASE.map(async (base) => {
        try {
          const rRes = await fetch(
            `https://api.github.com/repos/${base.repoOwner}/${base.repoName}`,
            { headers }
          );
          if (!rRes.ok) return base;
          const rJson = (await rRes.json()) as {
            html_url?: string;
            homepage?: string;
            description?: string | null;
            language?: string | null;
            stargazers_count?: number;
            updated_at?: string;
            owner?: { login?: string };
          };
          return {
            ...base,
            repoOwner: rJson.owner?.login || base.repoOwner,
            htmlUrl: rJson.html_url || base.htmlUrl,
            homepageUrl: rJson.homepage || base.homepageUrl,
            description:
              rJson.description && rJson.description.trim().length > 12
                ? rJson.description.trim()
                : base.description,
            primaryLanguage: rJson.language || base.primaryLanguage,
            stars:
              typeof rJson.stargazers_count === 'number' ? rJson.stargazers_count : base.stars,
            updatedAt: rJson.updated_at || base.updatedAt,
          };
        } catch {
          return base;
        }
      })
    );

    githubCache = {
      expiresAt: Date.now() + 10 * 60 * 1000,
      profile: {
        login: userJson.login || 'DotAliMurtaza',
        avatarUrl: userJson.avatar_url || 'https://avatars.githubusercontent.com/u/327850361?v=4',
        htmlUrl: userJson.html_url || 'https://github.com/DotAliMurtaza',
        publicRepos: userJson.public_repos ?? 15,
        bio:
          userJson.bio ||
          'Full-Stack Developer | Next.js, React, TypeScript & Tailwind CSS | Building modern, responsive & scalable web applications',
      },
      projects: repoResults,
      source: 'live',
    };
    return githubCache;
  } catch {
    githubCache = {
      expiresAt: Date.now() + 2 * 60 * 1000,
      profile: {
        login: 'DotAliMurtaza',
        avatarUrl: 'https://avatars.githubusercontent.com/u/327850361?v=4',
        htmlUrl: 'https://github.com/DotAliMurtaza',
        publicRepos: 15,
        bio: 'Full-Stack Developer | Next.js, React, TypeScript & Tailwind CSS | Building modern, responsive & scalable web applications',
      },
      projects: VERIFIED_REPO_BASE,
      source: 'verified-fallback',
    };
    return githubCache;
  }
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function generateCvPdfBuffer(): Buffer {
  const lines: Array<{ text: string; size: number; bold?: boolean; gapAfter?: number }> = [
    { text: 'ALI MURTAZA', size: 20, bold: true, gapAfter: 6 },
    { text: 'AI Full Stack Developer', size: 12, bold: true, gapAfter: 10 },
    {
      text: 'Location: Model Colony, Karachi, Pakistan  |  WhatsApp: +92 328 2305470',
      size: 9.5,
      gapAfter: 4,
    },
    {
      text: 'Email: amsiddiquikhan147@gmail.com  |  GitHub: github.com/DotAliMurtaza',
      size: 9.5,
      gapAfter: 16,
    },
    { text: 'PROFESSIONAL SUMMARY', size: 11, bold: true, gapAfter: 6 },
    {
      text: 'AI Full Stack Developer passionate about creating modern, responsive, and intelligent',
      size: 10,
      gapAfter: 4,
    },
    {
      text: 'digital experiences. Focused on transforming ideas into reliable web applications, interactive',
      size: 10,
      gapAfter: 4,
    },
    {
      text: 'browser games, and AI-assisted full-stack solutions with clean code and polished interfaces.',
      size: 10,
      gapAfter: 14,
    },
    { text: 'CORE TECHNOLOGIES', size: 11, bold: true, gapAfter: 6 },
    {
      text: 'Frontend: HTML5, CSS3, JavaScript, TypeScript, React.js, Next.js, Tailwind CSS',
      size: 10,
      gapAfter: 4,
    },
    {
      text: 'Backend & AI: Node.js, Python, Express, REST APIs, AI Integration, Git & GitHub',
      size: 10,
      gapAfter: 14,
    },
    { text: 'DEVELOPMENT EXPERIENCE', size: 11, bold: true, gapAfter: 6 },
    { text: '1. AI Full Stack Development', size: 10, bold: true, gapAfter: 3 },
    {
      text: '- Developing modern web applications, responsive UIs, AI integrations & backend APIs.',
      size: 9.5,
      gapAfter: 7,
    },
    { text: '2. Frontend Development', size: 10, bold: true, gapAfter: 3 },
    {
      text: '- Building responsive websites and interactive UI animations with React.js & Next.js.',
      size: 9.5,
      gapAfter: 7,
    },
    { text: '3. Personal Projects & Practical Development', size: 10, bold: true, gapAfter: 3 },
    {
      text: '- Creating interactive browser games, e-commerce websites, and maintaining GitHub repos.',
      size: 9.5,
      gapAfter: 14,
    },
    { text: 'FEATURED GITHUB PROJECTS (github.com/DotAliMurtaza)', size: 11, bold: true, gapAfter: 6 },
    {
      text: '- Car Game (Apex Racer): github.com/DotAliMurtaza/car-game | car-game-virid-six.vercel.app',
      size: 9.5,
      gapAfter: 4,
    },
    {
      text: '- Ludo King (3D Realm): github.com/DotAliMurtaza/ludo-king | ludokingmurtaza.vercel.app',
      size: 9.5,
      gapAfter: 4,
    },
    {
      text: '- Tom Gold Run 3D: github.com/DotAliMurtaza/tom-gold-run- | tomgoldrun.vercel.app',
      size: 9.5,
      gapAfter: 4,
    },
    {
      text: '- Shoes Website (AeroSole): github.com/DotAliMurtaza/shoes | shoes-five-nu.vercel.app',
      size: 9.5,
      gapAfter: 4,
    },
    {
      text: '- Unique Glasses (LUMOS): github.com/DotAliMurtaza/uniq-glasses | aliglasses.vercel.app',
      size: 9.5,
      gapAfter: 4,
    },
    {
      text: '- Ali Fragrance: github.com/DotAliMurtaza/Ali-fragrance | ali-fragrance-five.vercel.app',
      size: 9.5,
      gapAfter: 6,
    },
  ];

  let y = 760;
  const streamParts: string[] = ['BT'];
  for (const line of lines) {
    const fontKey = line.bold ? '/F2' : '/F1';
    streamParts.push(`${fontKey} ${line.size} Tf`);
    streamParts.push(`1 0 0 1 54 ${y} Tm`);
    streamParts.push(`(${escapePdfText(line.text)}) Tj`);
    y -= line.size + (line.gapAfter ?? 5);
  }
  streamParts.push('ET');
  const streamContent = streamParts.join('\n');

  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(streamContent, 'utf8')} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
}

interface InquiryRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  deliveredVia: 'smtp-and-inbox' | 'server-inbox';
}

function saveInquiryToDisk(record: InquiryRecord) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const filePath = path.join(dataDir, 'inquiries.json');
  let existing: InquiryRecord[] = [];
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) existing = parsed;
    } catch {
      existing = [];
    }
  }
  existing.unshift(record);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), 'utf8');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/github/projects', async (_req, res) => {
    const data = await fetchGitHubPortfolioData();
    res.json({
      profile: data.profile,
      projects: data.projects,
      source: data.source,
    });
  });

  app.get('/api/cv', (_req, res) => {
    const pdfBuffer = generateCvPdfBuffer();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Ali_Murtaza_CV.pdf"');
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.send(pdfBuffer);
  });

  app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = (req.body || {}) as Record<string, unknown>;

    const cleanName = typeof name === 'string' ? name.trim() : '';
    const cleanEmail = typeof email === 'string' ? email.trim() : '';
    const cleanSubject = typeof subject === 'string' ? subject.trim() : '';
    const cleanMessage = typeof message === 'string' ? message.trim() : '';

    if (cleanName.length < 2 || cleanName.length > 100) {
      res.status(400).json({ ok: false, error: 'Please enter your name (2–100 characters).' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail) || cleanEmail.length > 160) {
      res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
      return;
    }
    if (cleanSubject.length < 2 || cleanSubject.length > 160) {
      res.status(400).json({ ok: false, error: 'Please provide a brief subject line.' });
      return;
    }
    if (cleanMessage.length < 10 || cleanMessage.length > 4000) {
      res.status(400).json({
        ok: false,
        error: 'Please write a message of at least 10 characters.',
      });
      return;
    }

    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const receiver = process.env.CONTACT_RECEIVER_EMAIL?.trim() || 'amsiddiquikhan147@gmail.com';
    let deliveredVia: 'smtp-and-inbox' | 'server-inbox' = 'server-inbox';

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT || 587),
          secure: Number(process.env.SMTP_PORT || 587) === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });
        await transporter.sendMail({
          from: `"Portfolio Contact" <${smtpUser}>`,
          to: receiver,
          replyTo: cleanEmail,
          subject: `[Portfolio Inquiry] ${cleanSubject}`,
          text: `Name: ${cleanName}\nEmail: ${cleanEmail}\nSubject: ${cleanSubject}\n\nMessage:\n${cleanMessage}`,
        });
        deliveredVia = 'smtp-and-inbox';
      } catch (err) {
        console.error('SMTP delivery error:', err);
        res.status(502).json({
          ok: false,
          error:
            'Email relay configuration failed. Please contact Ali directly at amsiddiquikhan147@gmail.com or WhatsApp +92 328 2305470.',
        });
        return;
      }
    }

    try {
      const record: InquiryRecord = {
        id: `inq_${Date.now().toString(36)}`,
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        createdAt: new Date().toISOString(),
        deliveredVia,
      };
      saveInquiryToDisk(record);
      res.status(200).json({
        ok: true,
        id: record.id,
        deliveredVia,
        timestamp: record.createdAt,
      });
    } catch (err) {
      console.error('Failed to persist inquiry:', err);
      res.status(500).json({
        ok: false,
        error: 'Server could not record your message. Please try WhatsApp or email directly.',
      });
    }
  });

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*path}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

startServer();
