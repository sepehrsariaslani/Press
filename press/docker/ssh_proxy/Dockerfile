FROM ubuntu:20.04

ENV LANG C.UTF-8
ENV DEBIAN_FRONTEND noninteractive

# Use a local Ubuntu mirror for restricted international connectivity.
RUN sed -i 's|http://archive.ubuntu.com/ubuntu|http://mirror.iranserver.com/ubuntu|g; s|http://security.ubuntu.com/ubuntu|http://mirror.iranserver.com/ubuntu|g' /etc/apt/sources.list

# Install essential packages
RUN --mount=type=cache,target=/var/cache/apt apt-get update \
  && apt-get install --yes --no-install-suggests --no-install-recommends \
  openssh-server \
  && rm -rf /var/lib/apt/lists/* \
  `#stage-pre-essentials`

# Remove existing host keys
RUN rm /etc/ssh/ssh_host_*

COPY sshd_config /etc/ssh/sshd_config
COPY known_hosts /etc/ssh/ssh_known_hosts
COPY ca.pub /etc/ssh/ca.pub

COPY ssh_host_rsa_key /etc/ssh/ssh_host_rsa_key
COPY ssh_host_rsa_key.pub /etc/ssh/ssh_host_rsa_key.pub
COPY ssh_host_rsa_key-cert.pub /etc/ssh/ssh_host_rsa_key-cert.pub

RUN mkdir /run/sshd
RUN mkdir /etc/ssh/principals

RUN useradd -m -p '*' frappe

EXPOSE 22
VOLUME ["/home", "/etc"]
CMD ["/usr/sbin/sshd", "-D", "-e"]
