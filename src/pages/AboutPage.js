// src/pages/AboutPage.js
import React from 'react';
import ContentManager from '../components/ContentManager';
import SocialAccountsEditor from '../components/SocialAccountsEditor'; // Assuming you have a SocialAccountsEditor component

const AboutPage = () => {
  return (
    <div className="space-y-6">
      <ContentManager pageType="about" />
      <SocialAccountsEditor />
    </div>
  );
};

export default AboutPage;