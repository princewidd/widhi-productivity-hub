# Widhi Productivity Hub

Your all-in-one productivity companion for tasks, schedules, budget tracking, and notes.

## Features

- 📝 **Task Manager** - Manage tasks with deadlines and file attachments
- 📅 **Schedule Manager** - Weekly class schedules with reminders
- 💰 **Budget Tracker** - Track expenses with categories and summaries
- 📝 **Notes** - Personal notes with categories and search
- 💭 **Daily Quotes** - Motivational quotes in Indonesian and English
- 📱 **PWA Ready** - Install as mobile/desktop app
- 📤📥 **Export/Import** - Sync data across devices

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

3. Open in browser:
- Local: `http://localhost:3000`
- Network: `http://[your-ip]:3000`

## Deploy to Vercel

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Follow the prompts:
- Set up and deploy? **Y**
- Which scope? Choose your account
- Link to existing project? **N**
- Project name: `widhi-productivity-hub`
- Directory: `./`
- Override settings? **N**

5. Your app will be deployed to: `https://widhi-productivity-hub.vercel.app`

## Environment Variables

No environment variables required for basic functionality.

## File Upload

- **Local**: Files stored in `/uploads` directory
- **Production**: Files converted to base64 data URLs (temporary storage)

## PWA Installation

1. Open the website in a modern browser
2. Look for "Install App" button or browser install prompt
3. Click install to add to home screen

## Data Management

- **Auto-save**: All data automatically saved to browser localStorage
- **Export**: Download all data as JSON file
- **Import**: Upload JSON file to restore/merge data
- **Cross-device sync**: Use export/import to sync between devices

## Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## License

ISC