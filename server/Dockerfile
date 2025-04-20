# syntax=docker/dockerfile:1
# check=error=true

# This Dockerfile is designed for production, not development. Use with Kamal or build'n'run by hand:
# docker build -t server .
# docker run -d -p 80:80 -e RAILS_MASTER_KEY=<value from config/master.key> --name server server

# For a containerized dev environment, see Dev Containers: https://guides.rubyonrails.org/getting_started_with_devcontainer.html

# Make sure RUBY_VERSION matches the Ruby version in .ruby-version
ARG RUBY_VERSION=3.3.0
# Define Node.js version to use for building frontend
ARG NODE_VERSION=20

# --- Base Stage --- Find the base stage early, so it is not confusing
FROM docker.io/library/ruby:$RUBY_VERSION-slim AS base
WORKDIR /rails
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y curl libjemalloc2 libvips postgresql-client && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives
ENV RAILS_ENV="production" \
    BUNDLE_DEPLOYMENT="1" \
    BUNDLE_PATH="/usr/local/bundle" \
    BUNDLE_WITHOUT="development test"

# --- Build Stage --- Install build dependencies
FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Install application gems
COPY server/Gemfile server/Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

# Copy application code
COPY server/ . # Copy only server code here initially

# Precompile bootsnap code for faster boot times
RUN bundle exec bootsnap precompile app/ lib/

# Precompile Rails assets (if any - less common in API mode but good practice)
# If you don't have traditional Rails assets, you can potentially remove this.
# RUN bundle exec rails assets:precompile

# --- Node Build Stage --- Build the frontend application
FROM docker.io/library/node:$NODE_VERSION-slim AS build-node
WORKDIR /app

# Copy client package files and install dependencies
COPY client/package.json client/package-lock.json ./
RUN npm install

# Copy the rest of the client code
COPY client/ .

# Build the client application
RUN npm run build

# --- Final Stage --- Combine Rails app and frontend assets
FROM base

# Copy built Rails gems and application code
COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"
COPY --from=build /rails /rails

# Copy built frontend assets into Rails public directory
COPY --from=build-node /app/dist /rails/public/

# Ensure ownership and permissions are correct for runtime
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    chown -R rails:rails db log storage tmp public # Add public here
USER 1000:1000

# Entrypoint prepares the database.
ENTRYPOINT ["/rails/bin/docker-entrypoint"]

# Start server via Thruster by default
EXPOSE 80
CMD ["./bin/thrust", "./bin/rails", "server"]
