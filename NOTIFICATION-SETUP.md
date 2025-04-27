# Rolu Notification System Setup Guide

This guide explains how to set up the notification system for Rolu to send push notifications to users via World ID.

## Prerequisites

- A World ID App with push notification capabilities

## Environment Variables

Add these variables to your `.env` file:

```bash
# World ID Configuration
WORLD_ID_API_KEY=your_world_app_api_key
WORLD_APP_ID=your_world_app_id
```

## World ID Setup

1. Create a World ID App at [https://developer.worldcoin.org](https://developer.worldcoin.org)
2. Enable push notifications for your app
3. Get your API key and App ID from the developer dashboard
4. Add them to your `.env` file

## Testing Your Notification System

1. Make sure your application is running
2. Go to the admin dashboard: `/admin/notifications`
3. Create a new notification
4. Check the logs for any errors during sending

## Troubleshooting

### Common Issues

#### "Failed to send notifications to World App" Error

This usually means one of:

- The `WORLD_APP_API_KEY` is missing or invalid
- The `WORLD_APP_ID` is missing or invalid
- The users don't have wallet addresses in the database
- The wallet addresses are not registered with World ID

To fix:

1. Check your `.env` file for proper values
2. Make sure users have valid wallet addresses
3. Ensure you're using the correct API endpoint

#### No Users Found to Notify

This means no users in your database have:

- `has_notification_permission` set to `true` AND
- A valid `wallet_address`

To fix, ensure users have both of these fields properly set in the database.

## Database Structure

The system uses two key database tables:

1. **User Table**:

   - `has_notification_permission`: Boolean flag for users who want notifications
   - `wallet_address`: User's wallet address for World ID

2. **Notification Table**:
   - Tracks all sent notifications
   - Records success/failure
   - Counts users notified

## How It Works

The notification system:

1. Creates a notification record
2. Finds users with notification permissions
3. Sends notifications via World ID API
4. Updates notification status

All notifications are sent directly to the World ID API, which handles delivery to user devices.
