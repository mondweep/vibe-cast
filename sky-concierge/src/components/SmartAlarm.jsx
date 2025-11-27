import React from 'react';
import './SmartAlarm.css';

const SmartAlarm = ({ leaveTime, trafficStatus }) => {
    return (
        <div className="smart-alarm-card">
            <div className="alarm-icon">🔔</div>
            <div className="alarm-content">
                <div className="alarm-title">Leave by {leaveTime}</div>
                <div className="alarm-subtitle">
                    Traffic is <span className={`traffic-${trafficStatus.toLowerCase()}`}>{trafficStatus}</span>
                </div>
            </div>
            <div className="alarm-action">
                <button onClick={() => alert('Opening Maps...')}>Map</button>
            </div>
        </div>
    );
};

export default SmartAlarm;
