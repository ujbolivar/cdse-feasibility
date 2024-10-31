
# CDSE Feasibility

Code example for migration to cdse services for map data imaging

## Table of contents  
 * [Prerequisites](#prerequisites)  
 * [Run locally](#run-locally)  
    * [Clone the project](#clone-the-project)
    * [Go to the project directory](#go-to-the-project-directory)  
    * [Install dependencies](#install-dependencies)
    * [Environment variables](#environment-variables)
    * [Build the project](#build-the-project)
    * [Start the server](#start-the-server)
* [Troubleshooting](#troubleshooting)
* [License](#license)  

This document outlines the steps needed to run the web application locally.

## Prerequisites

Before you begin, ensure you have the following tools installed on your machine:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [Yarn](https://classic.yarnpkg.com/en/docs/install/) (for managing dependencies)
- [Live Server](https://github.com/tapio/live-server) (for serving your app)

## Run locally

Follow the steps below to set up and run the web application:

### Clone the project  

~~~bash  
git clone https://github.com/ujbolivar/cdse-feasibility.git
~~~

### Go to the project directory  

~~~bash  
cd cdse-feasibility
~~~

### Install dependencies

~~~bash  
yarn install
~~~

### Environment variables  

To run this project, you will need to add the following environment variables to your .env file

`CLIENT_ID`

`CLIENT_SECRET`

`CLMS_SENTINEL_INSTANCE_ID`

`CLMS_BYOC_INSTANCE_ID`

### Build the project

Run the following command to build the project:

~~~bash  
yarn build
~~~

### Start the server 
~~~bash  
live-server dist
~~~

The application should now be running at http://127.0.0.1:8080

## Troubleshooting

If you encounter issues, please ensure that:

All dependencies are installed correctly.
Your environment variables are set up properly in the .env file.
Your Node.js version is compatible (14 or higher).

## License  

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)  
