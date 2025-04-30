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

# --- Base Stage ---
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
# Set WORKDIR to the application root within the container
WORKDIR /rails/server

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev libyaml-dev pkg-config && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy Gemfile and Gemfile.lock first
COPY server/Gemfile server/Gemfile.lock ./

# Install application gems
RUN bundle install && \
    rm -rf ~/.bundle/ "${BUNDLE_PATH}"/ruby/*/cache "${BUNDLE_PATH}"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

# Copy the rest of the application code
# Note: This will overwrite Gemfile/Gemfile.lock but that's okay
COPY server/ .

# Precompile bootsnap code (paths are relative to WORKDIR /rails/server)
RUN bundle exec bootsnap precompile app/ lib/

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
FROM base AS final
# Set WORKDIR to the parent directory
WORKDIR /rails

# Copy built Rails gems
COPY --from=build "${BUNDLE_PATH}" "${BUNDLE_PATH}"

# Copy the entire built Rails application from the build stage
COPY --from=build /rails/server /rails/server

# Copy built frontend assets into the correct Rails public directory
COPY --from=build-node /app/dist /rails/server/public/

# Ensure ownership and permissions are correct for runtime, adjusting for server/ subdir
RUN groupadd --system --gid 1000 rails && \
    useradd rails --uid 1000 --gid 1000 --create-home --shell /bin/bash && \
    # Now chown all required directories, including the correct storage path
    chown -R rails:rails /rails/server/db /rails/server/log /rails/server/tmp /rails/server/public
USER 1000:1000

# Set the final working directory
WORKDIR /rails/server

# Entrypoint prepares the database
# Note: Entrypoint script path is relative to WORKDIR
ENTRYPOINT ["bin/docker-entrypoint"]

# Start server via Thruster using bundle exec
# Note: Commands are relative to WORKDIR
EXPOSE 80
CMD ["bundle", "exec", "thrust", "bin/rails", "server"]
