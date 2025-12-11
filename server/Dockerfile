# syntax=docker/dockerfile:1
ARG RUBY_VERSION=3.3.0
ARG NODE_VERSION=20

# --- Base Stage --------------------------------------------------------------
FROM ruby:${RUBY_VERSION}-slim AS base
WORKDIR /rails

RUN set -eux; \
    # add Bookworm-backports
    echo "deb http://deb.debian.org/debian bookworm-backports main" \
        > /etc/apt/sources.list.d/backports.list; \
    apt-get update -qq; \
    # runtime libs
    apt-get install --no-install-recommends -y \
        libjemalloc2 postgresql-client \
        libheif1 \
        -t bookworm-backports libvips42; \
    rm -rf /var/lib/apt/lists/*

ENV RAILS_ENV=production \
    BUNDLE_DEPLOYMENT=1 \
    BUNDLE_PATH=/usr/local/bundle \
    BUNDLE_WITHOUT="development test"


# ──────────────── Build stage ───────────────────────────────────
FROM base AS build
WORKDIR /rails/server

ARG RAILS_MASTER_KEY
ENV RAILS_MASTER_KEY=${RAILS_MASTER_KEY}

RUN set -eux; \
    apt-get update -qq; \
    apt-get install --no-install-recommends -y \
        build-essential git libpq-dev libyaml-dev pkg-config \
        -t bookworm-backports libvips-dev libvips-tools libheif-dev; \
    # show the linked libvips to verify in CI logs
    vips --version; \
    rm -rf /var/lib/apt/lists/*


COPY server/Gemfile server/Gemfile.lock ./
RUN bundle install && \
    rm -rf ~/.bundle/ "$BUNDLE_PATH"/ruby/*/cache "$BUNDLE_PATH"/ruby/*/bundler/gems/*/.git && \
    bundle exec bootsnap precompile --gemfile

COPY server/ .
RUN bundle exec bootsnap precompile app/ lib/
RUN SECRET_KEY_BASE_DUMMY=1 bundle exec rails assets:precompile

# ──────────────── Node build stage ──────────────────────────────
FROM node:${NODE_VERSION}-slim AS build-node
WORKDIR /app
COPY client/package*.json ./
RUN npm ci
COPY client/ .
RUN npm run build

# ──────────────── Final stage ───────────────────────────────────
FROM base AS final
WORKDIR /rails

COPY --from=build ${BUNDLE_PATH} ${BUNDLE_PATH}
COPY --from=build /rails/server /rails/server
COPY --from=build-node /app/dist /rails/server/public

RUN groupadd --system --gid 1000 rails && \
    useradd  --uid 1000 --gid 1000 --create-home --shell /bin/bash rails && \
    # make sure the dirs exist, then fix permissions
    mkdir -p /rails/server/db /rails/server/log /rails/server/tmp /rails/server/public && \
    chown -R rails:rails \
        /rails/server/db \
        /rails/server/log \
        /rails/server/tmp \
        /rails/server/public

USER 1000:1000

WORKDIR /rails/server
ENTRYPOINT ["bin/docker-entrypoint"]

EXPOSE 80
CMD ["bundle","exec","thrust","bin/rails","server"]
