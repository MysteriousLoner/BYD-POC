FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html byd_cars.json /usr/share/nginx/html/

EXPOSE 80
