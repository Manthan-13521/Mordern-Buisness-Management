"use client";

import React from "react";

export function MembershipCardPreview({ member, poolName }: { member: any; poolName?: string }) {
  const planName = member?.planId?.name || "N/A";
  const validTillDate = member?.planEndDate || member?.expiryDate;
  const validTill = validTillDate 
    ? new Date(validTillDate).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "N/A";

  const photoSrc = member?.photoUrl 
    ? (member.photoUrl.startsWith('http') ? member.photoUrl : `/api/members/${member._id}/photo`)
    : "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&h=533&q=80";

  const qrSrc = member?.qrCodeUrl 
    ? member.qrCodeUrl 
    : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${member?.memberId || 'UNKNOWN'}&color=082C6C`;

  return (
    <div className="card-wrapper" style={{ containerType: "inline-size", width: "100%", maxWidth: "1050px", margin: "0 auto", borderRadius: "20px", boxShadow: "0 25px 50px -12px rgba(8, 44, 108, 0.25)" }}>
      <style>{`
        .id-card {
          aspect-ratio: 1050 / 650;
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          position: relative;
          border: 1px solid rgba(8, 44, 108, 0.08);
          font-family: 'Inter', sans-serif;
        }
        
        .id-header {
          background: linear-gradient(135deg, #082C6C 0%, #0c3d96 100%);
          height: 22%;
          display: flex;
          align-items: center;
          padding: 0 4cqi;
          border-bottom: 0.8cqi solid #1976D2;
        }
        
        .header-logo {
          height: 65%;
          aspect-ratio: 1;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .header-logo svg {
          height: 100%;
          width: 100%;
        }
        
        .header-titles {
          flex: 1;
          padding-left: 3cqi;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .header-title {
          color: #ffffff;
          font-size: 4.8cqi;
          font-weight: 800;
          letter-spacing: 0.1cqi;
          line-height: 1.1;
          margin: 0;
        }
        
        .header-subtitle {
          color: #4FC3F7;
          font-size: 1.7cqi;
          font-weight: 600;
          letter-spacing: 0.15cqi;
          text-transform: uppercase;
          margin-top: 0.2cqi;
          margin-bottom: 0;
        }
        
        .header-icon {
          height: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          opacity: 0.95;
        }
        
        .header-icon svg {
          height: 100%;
        }
        
        .id-body {
          flex: 1;
          display: flex;
          padding: 3.5cqi 4cqi;
          gap: 4cqi;
          position: relative;
          background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }
        
        .bg-graphic {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 70%;
          height: 100%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 800 600' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,400 C200,250 400,550 600,400 C700,325 800,450 800,450 L800,600 L0,600 Z' fill='%231976D2' opacity='0.03'/%3E%3Cpath d='M0,450 C250,300 450,600 650,450 C750,375 800,450 800,450 L800,600 L0,600 Z' fill='%234FC3F7' opacity='0.03'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: bottom right;
          background-size: cover;
          pointer-events: none;
          z-index: 0;
        }
        
        .profile-section {
          width: 24%;
          display: flex;
          flex-direction: column;
          z-index: 1;
        }
        
        .profile-img-container {
          width: 100%;
          aspect-ratio: 3 / 4;
          border-radius: 1.5cqi;
          padding: 0.5cqi;
          background: #ffffff;
          border: 0.25cqi solid #1976D2;
          box-shadow: 0 1cqi 2.5cqi rgba(8, 44, 108, 0.12);
          overflow: hidden;
        }
        
        .profile-img-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 1cqi;
        }
        
        .details-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding-bottom: 1cqi;
          z-index: 1;
        }
        
        .member-name {
          font-size: 4cqi;
          font-weight: 800;
          color: #082C6C;
          margin-bottom: 2.2cqi;
          position: relative;
          margin-top: 0;
        }
        
        .member-name::after {
          content: '';
          position: absolute;
          bottom: -0.8cqi;
          left: 0;
          width: 12cqi;
          height: 0.4cqi;
          background-color: #4FC3F7;
          border-radius: 1cqi;
        }
        
        .detail-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          row-gap: 1.8cqi;
          column-gap: 2cqi;
          margin-top: 1.5cqi;
        }
        
        .detail-row {
          display: flex;
          align-items: center;
        }
        
        .detail-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 3.2cqi;
          height: 3.2cqi;
          background-color: #082C6C;
          border-radius: 50%;
          margin-right: 1.2cqi;
          flex-shrink: 0;
        }
        
        .detail-icon svg {
          width: 1.6cqi;
          height: 1.6cqi;
          stroke: #ffffff;
          fill: none;
          stroke-width: 2.2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        
        .detail-label {
          width: 7.5cqi;
          font-size: 1.45cqi;
          font-weight: 600;
          color: #64748b;
          flex-shrink: 0;
        }
        
        .detail-separator {
          margin-right: 1cqi;
          font-size: 1.45cqi;
          font-weight: 600;
          color: #e2e8f0;
        }
        
        .detail-value {
          font-size: 1.6cqi;
          font-weight: 700;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .qr-section {
          width: 22%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1;
        }
        
        .qr-container {
          width: 100%;
          aspect-ratio: 1;
          background: #ffffff;
          border: 0.25cqi solid #e2e8f0;
          border-radius: 1.5cqi;
          padding: 1.2cqi;
          box-shadow: 0 1cqi 2cqi rgba(0, 0, 0, 0.05);
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: -1.2cqi;
          z-index: 2;
        }
        
        .qr-container img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .qr-label {
          background-color: #082C6C;
          color: #ffffff;
          font-size: 1.3cqi;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05cqi;
          padding: 1.2cqi 0;
          width: 100%;
          text-align: center;
          border-radius: 0.8cqi;
          z-index: 3;
          box-shadow: 0 0.5cqi 1cqi rgba(8, 44, 108, 0.2);
        }
        
        .qr-helper {
          font-size: 1.05cqi;
          font-weight: 500;
          color: #64748b;
          margin-top: 1.5cqi;
          text-align: center;
        }
        
        .id-footer {
          height: 18%;
          display: flex;
          background-color: #ffffff;
        }
        
        .footer-left {
          flex: 5.5;
          background-color: #082C6C;
          color: #ffffff;
          clip-path: polygon(0 0, 100% 0, 93% 100%, 0% 100%);
          display: flex;
          align-items: center;
          padding: 0 4cqi;
          gap: 2cqi;
          z-index: 2;
        }
        
        .footer-right {
          flex: 4.5;
          background-color: #4FC3F7;
          color: #082C6C;
          display: flex;
          align-items: center;
          padding: 0 4cqi 0 6.5cqi;
          gap: 2cqi;
          margin-left: -5%;
          z-index: 1;
        }
        
        .footer-icon-circle {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 5.5cqi;
          height: 5.5cqi;
          border: 0.25cqi solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          flex-shrink: 0;
        }
        
        .footer-right .footer-icon-circle {
          border-color: rgba(8, 44, 108, 0.15);
        }
        
        .footer-icon-circle svg {
          width: 2.8cqi;
          height: 2.8cqi;
          stroke: #ffffff;
          fill: none;
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        
        .footer-right .footer-icon-circle svg {
          stroke: #082C6C;
        }
        
        .footer-text {
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        
        .footer-label {
          font-size: 1.25cqi;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05cqi;
          opacity: 0.9;
          margin-bottom: 0.2cqi;
        }
        
        .footer-value {
          font-size: 2.6cqi;
          font-weight: 800;
          letter-spacing: 0.05cqi;
          line-height: 1.1;
        }
      `}</style>
      
      <div className="id-card">
        {/* HEADER */}
        <header className="id-header">
          <div className="header-logo">
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <path id="curve" d="M 15 50 A 35 35 0 1 1 85 50 A 35 35 0 1 1 15 50" fill="transparent"/>
              <text fontFamily="Inter" fontSize="11" fontWeight="800" fill="white" letterSpacing="2">
                <textPath href="#curve" startOffset="50%" textAnchor="middle">
                  {poolName || "AQUA ELITE CLUB"}
                </textPath>
              </text>
              <path d="M 30 55 Q 50 45 70 55" stroke="#4FC3F7" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <path d="M 30 65 Q 50 55 70 65" stroke="#4FC3F7" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <circle cx="45" cy="40" r="4" fill="white"/>
              <path d="M 35 48 L 45 45 L 55 47 L 65 40" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
          <div className="header-titles">
            <h1 className="header-title">SWIMMING POOL</h1>
            <p className="header-subtitle">Official Membership Card</p>
          </div>
          <div className="header-icon">
            <svg viewBox="0 0 120 60" xmlns="http://www.w3.org/2000/svg">
              <path d="M 10 40 Q 30 25 50 40 T 90 40 T 110 40" stroke="#4FC3F7" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <path d="M 10 52 Q 30 37 50 52 T 90 52 T 110 52" stroke="#4FC3F7" strokeWidth="3" strokeLinecap="round" fill="none"/>
              <circle cx="85" cy="20" r="7" fill="white"/>
              <path d="M 50 38 L 70 30 L 95 35 L 105 25" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </div>
        </header>
        
        {/* BODY */}
        <main className="id-body">
          <div className="bg-graphic"></div>
          
          <div className="profile-section">
            <div className="profile-img-container">
              <img src={photoSrc} alt="Member Photo" crossOrigin="anonymous" />
            </div>
          </div>
          
          <div className="details-section">
            <h2 className="member-name">{member?.name?.toUpperCase() || "MEMBER NAME"}</h2>
            
            <div className="detail-grid">
              <div className="detail-row">
                <div className="detail-icon">
                  <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2" ry="2"></rect><circle cx="9" cy="10" r="2"></circle><line x1="15" y1="8" x2="17" y2="8"></line><line x1="15" y1="12" x2="17" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>
                </div>
                <div className="detail-label">ID Number</div>
                <div className="detail-separator">:</div>
                <div className="detail-value">{member?.memberId || "M-00000"}</div>
              </div>
              
              <div className="detail-row">
                <div className="detail-icon">
                  <svg viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                </div>
                <div className="detail-label">Age</div>
                <div className="detail-separator">:</div>
                <div className="detail-value">{member?.age || "N/A"}</div>
              </div>
              
              <div className="detail-row">
                <div className="detail-icon">
                  <svg viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                </div>
                <div className="detail-label">Phone</div>
                <div className="detail-separator">:</div>
                <div className="detail-value">{member?.phone || "N/A"}</div>
              </div>
            </div>
          </div>
          
          <div className="qr-section">
            <div className="qr-container">
              <img src={qrSrc} alt="Membership QR Code" crossOrigin="anonymous" />
            </div>
            <div className="qr-label">SCAN FOR ENTRY</div>
            <div className="qr-helper">Verify membership instantly</div>
          </div>
        </main>
        
        {/* FOOTER */}
        <footer className="id-footer">
          <div className="footer-left">
            <div className="footer-icon-circle">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            <div className="footer-text">
              <span className="footer-label">Membership Plan</span>
              <span className="footer-value">{planName.toUpperCase()}</span>
            </div>
          </div>
          <div className="footer-right">
            <div className="footer-icon-circle">
              <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="M9 12l2 2 4-4"></path></svg>
            </div>
            <div className="footer-text">
              <span className="footer-label">Valid Till</span>
              <span className="footer-value">{validTill}</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
