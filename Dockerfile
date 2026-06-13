# Use a lightweight Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy the entire workspace into the container
COPY . .

# Configure port for Hugging Face Spaces (defaults to 7860)
ENV PORT=7860

# Install dependencies and build the static frontend
RUN npm run build

# Expose port 7860
EXPOSE 7860

# Start the Express server
CMD ["npm", "start"]
