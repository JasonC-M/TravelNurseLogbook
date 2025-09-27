# Feature Ideas for Travel Nurse Logbook

## Future Enhancements

### Browser Geolocation for Smart Map Centering
- **Concept**: Use browser's geolocation API to detect user's current location
- **Implementation**: Set default map view to user's current region instead of always defaulting to CONUS
- **Benefits**: 
  - More relevant default view for international users
  - Automatic regional relevance without manual configuration
  - Better UX for users traveling/working in different regions
- **Considerations**:
  - Privacy permissions required
  - Fallback to CONUS if permission denied
  - Accuracy limitations of browser geolocation
  - Need to map coordinates to our 14 regional zones

### Other Ideas
- Add more granular regional filtering (state-level, country-level)
- Remember last map view position/zoom per session
- Contract clustering for high-density areas
- Custom map markers for different contract types
- Export contract locations as KML/GPX files