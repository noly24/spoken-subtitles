# Chrome Web Store Review Response

## If Asked About Host Permissions:

**Question:** Why does your extension need "<all_urls>" permission?

**Response:**
```
Our extension provides universal subtitle-to-speech accessibility for streaming content. The "<all_urls>" permission is required because:

1. **Universal Compatibility:** Users access streaming content on countless websites worldwide, not just major platforms like Netflix and YouTube.

2. **International Support:** Many international streaming services, regional platforms, and emerging services need subtitle accessibility.

3. **Future-Proofing:** New streaming services launch regularly, and users expect the extension to work without updates.

4. **Core Functionality:** The permission is used SOLELY for:
   - Detecting subtitle text on web pages
   - Reading subtitles aloud using browser TTS
   - Providing OCR fallback for canvas-based captions

5. **Privacy & Security:** All processing happens locally in the browser. No data is collected, stored, or transmitted. The extension only accesses subtitle content that users are already viewing.

The broad permission is necessary for the extension's single purpose: making subtitle text accessible through speech on any streaming website.
```

## If Asked About Single Purpose:

**Question:** Please clarify the extension's single purpose.

**Response:**
```
Single Purpose: Convert text subtitles to spoken audio for accessibility.

The extension has one narrow, easy-to-understand purpose: helping users with visual impairments, learning disabilities, or those who prefer audio access to enjoy streaming content by converting subtitle text into speech.

All features (voice selection, OCR fallback, multi-site support) serve this single accessibility purpose.
```

## If Asked About Content Scripts:

**Question:** Why do you need content scripts on all URLs?

**Response:**
```
Content scripts run on all URLs to detect and process subtitle text on streaming websites. The scripts:
- Only activate on pages with video content and subtitles
- Use minimal, read-only access to subtitle elements
- Process text locally for speech synthesis
- Never modify page content or collect data

This approach ensures the extension works universally while maintaining user privacy and security.
```

## General Response Tips:
- Be concise but thorough
- Reference your privacy policy
- Mention the open source code
- Emphasize accessibility benefits
- Respond within 24 hours of reviewer messages