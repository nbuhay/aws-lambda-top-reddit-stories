# -*- mode: ruby -*-
# vi: set ft=ruby :

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.provision "shell",
    inline: <<-SHELL

      # install git
      apt-get install -y git

      # clone bu-toolbox
      git clone --depth 1 https://github.com/nbuhay/bu-toolbox.git

      # install Node.js and awscli
      chmod u+x ./bu-toolbox/linux/ubuntu/install/nodejs.sh
      ./bu-toolbox/linux/ubuntu/install/nodejs.sh
      chmod u+x ./bu-toolbox/linux/ubuntu/install/awscli.sh      
      ./bu-toolbox/linux/ubuntu/install/awscli.sh
      
      # install global gulp.js
      npm install --global gulp
    SHELL
  config.vm.network "private_network", type: "dhcp"
  config.vm.network "forwarded_port", guest: 3001, host: 3001, host_ip: "127.0.0.1"
  config.vm.synced_folder ".", "/home/vagrant/aws-lambda-top-stories"
end
