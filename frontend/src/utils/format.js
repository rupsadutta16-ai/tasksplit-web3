import { ethers } from 'ethers';


export const formatEth = (value, isWei = true) => {
    if (!value || value === '0') return '0';

    try {
        const ethValue = isWei ? ethers.formatEther(value) : value.toString();
        const num = Number(ethValue);

        return num.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 4
        });
    } catch (e) {
        console.error("Format error:", e);
        return '0';
    }
};


export const formatPoints = (pts) => {
    if (!pts) return '0';
    return Number(pts).toString();
};
