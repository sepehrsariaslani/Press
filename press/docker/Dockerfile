FROM python:{{ doc.get_dependency_version("python") }} AS python_base
FROM node:{{ doc.get_dependency_version("node").split(".")[0] }} AS node_base
FROM ubuntu:24.04

ENV FRAPPE_DOCKER_BUILD True
ENV LANG C.UTF-8
ENV DEBIAN_FRONTEND noninteractive

ENV OPENBLAS_NUM_THREADS 1
ENV MKL_NUM_THREADS 1

# Use a local Ubuntu mirror for restricted international connectivity.
RUN if [ -f /etc/apt/sources.list ]; then \
      sed -i 's|http://archive.ubuntu.com/ubuntu|http://mirror.iranserver.com/ubuntu|g; s|http://security.ubuntu.com/ubuntu|http://mirror.iranserver.com/ubuntu|g' /etc/apt/sources.list; \
    fi \
 && if [ -f /etc/apt/sources.list.d/ubuntu.sources ]; then \
      sed -i 's|http://archive.ubuntu.com/ubuntu|http://mirror.iranserver.com/ubuntu|g; s|http://security.ubuntu.com/ubuntu|http://mirror.iranserver.com/ubuntu|g' /etc/apt/sources.list.d/ubuntu.sources; \
    fi

# Install essential packages
RUN --mount=type=cache,sharing=locked,target=/var/cache/apt apt-get update \
  && apt-get install --yes --no-install-suggests --no-install-recommends \
  # Essentials
  build-essential \
  git \
  mariadb-client \
  libmariadb-dev \
  pkg-config \
  pv \
  ntp \
  wget \
  curl \
  supervisor \
  file \
  # Dependencies for SSH access
  openssh-server \
  nano \
  vim \
  less \
  htop \
  iputils-ping \
  telnet \
  # Dependencies for adding Python PPA
  software-properties-common \
  gnupg \
  # weasyprint dependencies
  libpango-1.0-0 \
  libharfbuzz0b \
  libpangoft2-1.0-0 \
  libpangocairo-1.0-0 \
  # Chromium and dependencies
  chromium-browser \
  libnss3 \
  libatk1.0-0 \
  fonts-liberation \
  libatk-bridge2.0-0 \
  ibatspi2.0-0 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  xdg-utils \
  libvulkan1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxkbcommon0 \
  libxrandr2 \
  # Ubuntu 24 uses the t64 package name for ALSA runtime.
  libasound2t64 \
  # wkhtmltopdf dependencies
  ca-certificates \
  fontconfig \
  libfreetype6 \
  libjpeg-turbo8 \
  libpng16-16 \
  libx11-6 \
  libxcb1 \
  libxext6 \
  libxrender1 \
  xfonts-75dpi \
  xfonts-base \
  # pycups dependencies
  gcc \
  libcups2-dev \
  # s3-attachment dependencies
  libmagic1 \
  && rm -rf /var/lib/apt/lists/* \
  `#stage-pre-essentials`

COPY --chown=root:root supervisord.conf /etc/supervisor/supervisord.conf

# Install Redis from Ubuntu mirror to avoid external repository dependency.
RUN --mount=type=cache,sharing=locked,target=/var/cache/apt apt-get update \
  && apt-get install --yes --no-install-suggests --no-install-recommends \
  redis-server \
  && rm -rf /var/lib/apt/lists/* `#stage-pre-redis`

# Copy Python runtime from official Python image to avoid external PPA dependency.
COPY --from=python_base /usr/local /usr/local

ENV {{ doc.get_dependency_version("python", True) }}
RUN ln -sf /usr/local/bin/python${PYTHON_VERSION} /usr/bin/python${PYTHON_VERSION} \
  && ln -sf /usr/local/bin/pip${PYTHON_VERSION} /usr/bin/pip${PYTHON_VERSION} \
  `#stage-pre-python`

# Install wkhtmltopdf
ENV {{ doc.get_dependency_version("wkhtmltopdf", True) }}


RUN --mount=type=cache,sharing=locked,target=/var/cache/apt apt-get update \
  && apt-get install --yes --no-install-suggests --no-install-recommends wkhtmltopdf \
  && rm -rf /var/lib/apt/lists/* \
  `#stage-pre-wkhtmltopdf`

{% if doc.is_code_server_enabled %}
RUN curl -fsSL https://code-server.dev/install.sh | sh `#stage-pre-code-server`
{% endif %}

# Refresh font cache without pulling external repositories.
RUN fc-cache -fv \
  `#stage-pre-fonts`


# Set max_allowed_packet to 512 MB for mysqldump
RUN echo "[mysqldump]\nmax_allowed_packet              = 512M" > /etc/mysql/conf.d/mysqldump.cnf

# Add frappe user
RUN useradd -ms /bin/bash frappe

# Install Additional Packages
{% for p in doc.additional_packages %}

# Run before install scripts
{% if p.prerequisites %}
RUN --mount=type=cache,sharing=locked,target=/var/cache/apt {{ p.prerequisites }} \
  `#stage-pre_before-{{ p.package }}`
{% endif %}

# Install non Ubuntu packages
{% if p.package_manager not in ["apt-get", "apt"] %}
RUN {{ p.package_manager }} install {{ p.package }} \
  `#stage-pre-{{ p.package }}`

# Install Ubuntu packages
{% else %}
RUN apt-get update \
  && apt-get install --yes --no-install-suggests --no-install-recommends {{ p.package }} \
  && rm -rf /var/lib/apt/lists/* \
  `#stage-pre-{{ p.package }}`
{% endif %}

# Run after install scripts
{% if p.after_install %}
RUN  --mount=type=cache,sharing=locked,target=/var/cache/apt {{ p.after_install }} \
  && rm -rf /var/lib/apt/lists/* \
  `#stage-pre_after-{{ p.package }}`
{% endif %}

{% endfor %}


# symlink mysqldump to mariadb-dump
RUN test -f /usr/bin/mariadb-dump || ln -s /usr/bin/mysqldump /usr/bin/mariadb-dump

ENV {{ doc.get_dependency_version("node", True) }}
COPY --from=node_base /usr/local/bin/node /usr/local/bin/node
COPY --from=node_base /usr/local/bin/npm /usr/local/bin/npm
COPY --from=node_base /usr/local/bin/npx /usr/local/bin/npx
COPY --from=node_base /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -sf /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
  && ln -sf /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx \
  && node --version \
  && npm --version \
  `#stage-pre-node`

# Install Yarn
RUN npm config set registry https://mirror2.chabokan.net/npm/ \
  && npm install -g yarn \
  `#stage-pre-yarn`

# Route pip installs through local mirror (HTTP avoids SSL-module dependency in copied Python runtime).
ENV PIP_INDEX_URL http://mirror2.chabokan.net/pypi/simple
ENV PIP_TRUSTED_HOST mirror2.chabokan.net
ENV UV_DEFAULT_INDEX http://mirror2.chabokan.net/pypi/simple
ENV UV_INDEX_URL http://mirror2.chabokan.net/pypi/simple

# Switch to frappe
USER frappe
WORKDIR /home/frappe

# Install Bench
ENV PATH "$PATH:/home/frappe/.local/bin"

ENV {{ doc.get_dependency_version("pip", True) }}
RUN python${PYTHON_VERSION} -m pip --version `#stage-pre-pip`

ENV {{ doc.get_dependency_version("bench", True) }}
RUN --mount=type=cache,target=/home/frappe/.cache,uid=1000,gid=1000 python${PYTHON_VERSION} -m pip install --upgrade frappe-bench==${BENCH_VERSION} `#stage-bench-bench`

RUN --mount=type=cache,target=/home/frappe/.cache,uid=1000,gid=1000 python${PYTHON_VERSION} -m pip install Jinja2~=3.0.3
RUN --mount=type=cache,target=/home/frappe/.cache,uid=1000,gid=1000 python${PYTHON_VERSION} -m pip install --upgrade setuptools

RUN git config --global advice.detachedHead false

ENV PYTHONUNBUFFERED 1

# For the sake of completing the step
RUN `#stage-bench-env`

# Set environment variables
{% for v in doc.environment_variables %}
ENV {{v.key}} {{ v.value }}
{% endfor %}

# Install Boto and Requests for Asset store access
RUN --mount=type=cache,target=/home/frappe/.cache,uid=1000,gid=1000 \
  python${PYTHON_VERSION} -m pip install boto3 botocore requests \
  `#stage-pre-Configure Asset Store`

# Install Frappe app
RUN --mount=type=bind,source=apps/frappe,target=/home/frappe/context/apps/frappe \
  UV_CACHE_DIR=/tmp/uv-cache \
  bench init --python /usr/bin/python${PYTHON_VERSION} --no-backups --frappe-path file:///home/frappe/context/apps/frappe frappe-bench \
  `#stage-apps-frappe`
WORKDIR /home/frappe/frappe-bench

RUN --mount=type=cache,target=/home/frappe/.cache,uid=1000,gid=1000 /home/frappe/frappe-bench/env/bin/pip install pycups==2.0.1

# Install Redisearch 2.0 from precompiled binaries
COPY --chown=frappe:frappe redis /home/frappe/frappe-bench/redis
COPY --chown=frappe:frappe .vimrc /home/frappe/.vimrc
COPY --chown=frappe:frappe common_site_config.json /home/frappe/frappe-bench/sites/common_site_config.json

# Pass control of get-app to a python file
COPY get_cached_app.py /usr/local/bin/get_cached_app.py
RUN chmod +x /usr/local/bin/get_cached_app.py

# Install other apps
{% for app in doc.apps %}
{% if app.app != "frappe"%}


{% if app.use_cached and use_asset_store %}
RUN --mount=type=bind,source=apps/{{ app.app }},target=/home/frappe/context/apps/{{ app.app }} \
  --mount=type=secret,id=build_token,mode=0444 \
  BUILD_TOKEN="$(cat /run/secrets/build_token)" && python${PYTHON_VERSION} /usr/local/bin/get_cached_app.py \
  {{ app.app }} \
  {{ app.hash }} \
  "$BUILD_TOKEN" \
  {{ site_url }} \
  {{ upload_assets }} \
  `#stage-apps-{{ app.app }}`
{% else %}
RUN --mount=type=cache,sharing=locked,target=/home/frappe/.cache,uid=1000,gid=1000 \
  --mount=type=bind,source=apps/{{ app.app }},target=/home/frappe/context/apps/{{ app.app }} \
  bench get-app file:///home/frappe/context/apps/{{ app.app }} \
  `#stage-apps-{{ app.app }}`
{% endif %}


{% endif %}
{% endfor %}

# Pull app updates from mounted repository
{% for app in doc.apps %}
{% if app.pullable_release %}
RUN --mount=type=bind,source=app_updates/{{ app.app }},target=/home/frappe/context/app_updates/{{ app.app }} \
  cd /home/frappe/frappe-bench/apps/{{ app.app }} \
  && git reset --hard \
  && git remote add -f app_update /home/frappe/context/app_updates/{{ app.app }} \
  && git fetch --depth 1 app_update {{ app.pullable_hash }} \
  && git checkout {{ app.pullable_hash }} \
  && git remote remove app_update \
  `#stage-pull-{{ app.app }}`
{% endif %}
{% endfor %}


COPY --chown=frappe:frappe config /home/frappe/frappe-bench/config
COPY --chown=frappe:frappe apps.txt /home/frappe/frappe-bench/sites/apps.txt

# Create custom mounts
{% for m in doc.container_mounts %}
RUN mkdir -p {{ m.destination }} && \
  chown -R frappe:frappe {{ m.destination }} \
  `#stage-mounts-create`
{% endfor %}

ENV FRAPPE_DOCKER_BUILD=
ENV FRAPPE_HARD_LINK_ASSETS True
ENV HISTTIMEFORMAT "%Y-%m-%d %T "

EXPOSE 8000 9000 2200 8088
CMD ["supervisord"]
