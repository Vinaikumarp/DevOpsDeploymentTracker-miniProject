FROM mysql:8.4

ENV MYSQL_ROOT_PASSWORD="nodejspassword"
ENV MYSQL_DATABASE="deployment_tracker"
#dont expose passwords here
COPY schema.sql /docker-entrypoint-initdb.d/schema.sql
