export const BRANCHES = ["Andhra Pradesh", "Bangalore", "Chennai", "Delhi", "Hyderabad", "Madhya Pradesh", "Mum_Thn", "Pune", "Rajasthan", "RO TEL", "RO KAR", "RO TN", "ROM", "UP EAST", "Uttar Pradesh", "West Bengal", "UP WEST"];

export const BRANDS = ["VW", "SPPL", "VIDEOCON", "AMAZON", "NIPPO", "LEDVANCE", "AERO NERO"];

export const HEADER_MAP = {
    // Date
    "date": "date", "date logged": "date", "logged date": "date", "entry date": "date", "date of entry": "date", "case date": "date", "created date": "date", "escalation": "date", "escallation": "date", "escalltion": "date",
    // ID
    "id": "id", "reference id": "id", "case id": "id", "reference no": "id", "ref id": "id", "ticket id": "id", "case #": "id", "reference #": "id", "service order id": "id", "sirus id": "id", "escalation id": "id",
    // Branch
    "branch": "branch", "location": "branch", "branch / location": "branch", "store": "branch", "hub": "branch", "branch name": "branch", "store name": "branch", "hub name": "branch", "state": "branch", "region": "branch",
    // Brand
    "brand": "brand", "model": "brand", "brand / model": "brand", "product": "brand", "make": "brand", "brand name": "brand",
    // Closed Date
    "esc date": "closedDate", "escalation date": "closedDate", "esc_date": "closedDate", "escalation_date": "closedDate", "closed date": "closedDate", "close date": "closedDate",
    // Reason
    "reason": "reason", "issue": "reason", "primary issue": "reason", "complaint": "reason", "problem": "reason", "issue description": "reason",
    // City
    "city": "city", "region": "city", "district": "city", "town": "city", "branch city": "city",
    // Aging
    "aging": "aging", "aging (days)": "aging", "days": "aging", "pending days": "aging", "age": "aging", "ageing": "aging",
    // Status
    "status": "status", "current status": "status", "case status": "status", "resolution": "status", "job status": "status",
    // Remark
    "remark": "remark", "remarks": "remark", "technician remarks": "remark", "note": "remark", "comments": "remark", "final remark": "remark",
    // Service Type
    "service type": "serviceType", "type of service": "serviceType", "service": "serviceType", "service_type": "serviceType",
    // Special
    "date (dd-mm-yy)": "receiptDate"
};

export const API_URL = '/api/escalations';
