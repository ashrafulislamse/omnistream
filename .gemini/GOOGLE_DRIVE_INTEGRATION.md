# Google Drive Integration - Implementation Plan

## Overview
Expand TerraStream to support streaming videos from Google Drive, making it a multi-cloud media streaming platform.

## Features

### Phase 1: Core Integration ✅ COMPLETE
- [x] Google OAuth 2.0 authentication
- [x] Connect/Disconnect Google Drive account
- [x] List files and folders from Drive
- [x] Filter and display video files
- [x] Stream videos directly from Drive
- [x] Sources management page
- [x] Drive browser with grid/list views
- [x] Search within videos

### Phase 2: Enhanced Features
- [ ] Folder navigation/browser
- [ ] Multiple Drive accounts
- [ ] Shared drives support
- [ ] Offline favorites
- [ ] OneDrive integration
- [ ] Dropbox integration

## Technical Architecture

### Google OAuth Setup
```
Client ID: [Configure in Google Cloud Console]
Scopes: 
  - https://www.googleapis.com/auth/drive.readonly
  - https://www.googleapis.com/auth/userinfo.profile
```

### API Endpoints Used
- `GET /drive/v3/files` - List files
- `GET /drive/v3/files/{fileId}` - Get file metadata
- `GET /drive/v3/files/{fileId}?alt=media` - Stream file

### File Types Supported
- video/mp4
- video/webm
- video/x-matroska (mkv)
- video/avi
- video/quicktime (mov)

## UI Components

### 1. Sources Page (`/sources`)
- Grid of available cloud sources
- Connect/disconnect buttons
- Connection status indicators
- Storage usage display

### 2. Drive Browser (`/drive`)
- Folder tree navigation
- Video file grid/list
- Search and filter
- Quick actions (stream, download, favorite)

### 3. Unified Stream Page
- Source selector (TeraBox / Google Drive / URL)
- Consistent streaming experience across sources

## Security Considerations
- Access tokens stored securely
- Refresh tokens handled automatically
- User can revoke access anytime
- No file content stored on our servers

## Implementation Files
- `src/services/googleDrive.ts` - API service
- `src/hooks/useGoogleDrive.ts` - React hook
- `src/pages/Sources.tsx` - Sources management page
- `src/pages/Drive.tsx` - Drive browser page
- `src/components/DriveFileBrowser.tsx` - File browser component
