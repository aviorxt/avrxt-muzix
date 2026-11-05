'use client';
import {useEffect} from 'react';
export default function MotionEffects(){
  useEffect(()=>{
    if(!('IntersectionObserver' in window)||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const elements=document.querySelectorAll('.rotation-section,.tracks-section>article,.on-loop,.albums-section,.newsletter-section');
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}},{threshold:0.06});
    elements.forEach(element=>{element.classList.add('reveal-section');observer.observe(element);});
    return()=>{observer.disconnect();elements.forEach(e=>e.classList.remove('reveal-section'));};
  },[]);
  return null;
}
