# Rolu Admin Dashboard

This is the admin dashboard for the Rolu Educational Gaming Platform. It provides a comprehensive interface for managing game settings, brand configurations, assets, and promotional content.

## Features

- **Dashboard**: Overview of key metrics and statistics
- **Game Settings**: Configure game mechanics, item frequencies, scoring, and quiz settings
- **Brand Management**: Manage brand configurations, colors, and assets
- **Asset Management**: Upload and manage game assets using Cloudinary integration
- **Promotional Cards**: Create and manage promotional cards for the home page
- **Settings**: Configure general settings, localization, database, and notifications

## Cloudinary Integration

The admin dashboard uses Cloudinary for asset management. To set up Cloudinary integration:

1. Create a Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Create upload presets for different asset types:
   - `rolu_assets`: For game assets (player characters, obstacles, collectibles, etc.)
   - `rolu_assets`: For promotional card images
3. Configure the following environment variables:
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME="your_cloud_name"
   NEXT_PUBLIC_CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"
   ```

## API Endpoints

The admin dashboard uses the following API endpoints:

- `/api/sign-cloudinary-params`: Signs Cloudinary upload parameters for secure uploads
- `/api/assets`: CRUD operations for game assets
- `/api/assets/[id]`: CRUD operations for a specific game asset
- `/api/brands`: CRUD operations for brands
- `/api/brands/[id]`: CRUD operations for a specific brand
- `/api/promo-cards`: CRUD operations for promotional cards
- `/api/promo-cards/[id]`: CRUD operations for a specific promotional card
- `/api/game-settings`: CRUD operations for game settings

## Development

To run the admin dashboard locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`
4. Run the development server: `npm run dev`
5. Access the admin dashboard at `http://localhost:3000/admin`

## Deployment

The admin dashboard is deployed along with the main application. No additional deployment steps are required.

## Security

The admin dashboard is currently not protected by authentication. In a production environment, you should implement authentication and authorization to restrict access to authorized administrators only.
