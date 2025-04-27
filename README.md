# Rolu Educational Gaming Platform

This is an educational gaming platform built with Next.js that features a 3-lane runner game integrated with quizzes and educational content. The platform supports multiple brand configurations for white-label customization.

## Features

- 3-lane runner game with obstacles, collectibles, and quiz items
- Educational quizzes integrated into gameplay
- Score and distance tracking
- Database integration for storing game sessions, quiz responses, and user stats
- Brand customization with configurable assets
- Token transactions system for blockchain rewards

## Getting Started

### Prerequisites

- Node.js 18.x or later
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/rolu-new.git
cd rolu-new
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up the database:

Create a PostgreSQL database and update the `.env` file with your database connection string:

```
DATABASE_URL="postgresql://username:password@localhost:5432/rolu?schema=public"
```

4. Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. Seed the database with initial data:

```bash
npm run prisma:seed
```

6. Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database Schema

The application uses Prisma ORM with the following models:

- **User**: Stores user information, XP, and Rolu balance
- **GameSession**: Records game sessions with score, distance, and XP earned
- **Quiz**: Stores quiz questions with options
- **QuizResponse**: Records user responses to quizzes
- **Brand**: Stores brand configurations
- **GameAsset**: Stores game assets (player, obstacles, collectibles, backgrounds)
- **TokenTransaction**: Stores token claim transactions with status tracking

## Token Transaction System

The platform includes a token reward system that allows users to claim ROLU tokens. Token claims are processed in batches to optimize gas costs. The system includes:

- In-app token balance tracking
- Batch processing of token claims
- Status tracking with the ClaimStatus enum (QUEUED, PROCESSING, COMPLETED, FAILED)
- Retry logic for failed transactions

### Database Fix for TokenTransaction

If you encounter issues with the `retry_count` column, you can run the following script to ensure it exists:

```bash
npm run fix:retry-column
```

This script will:
1. Check if the `retry_count` column exists in the TokenTransaction table
2. Add the column if it doesn't exist
3. Create the necessary index for query optimization

## API Routes

- **/api/game/start**: Initializes a game session with brand configuration
- **/api/game/submit**: Submits game results and updates user stats
- **/api/quizzes**: Fetches quiz questions based on brand

## Game Mechanics

The game features a 3-lane runner system where the player can switch between lanes to avoid obstacles and collect items. The game includes:

- Obstacle avoidance
- Collectible items for points
- Quiz items that trigger educational quizzes
- Progressive difficulty scaling based on distance traveled

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
