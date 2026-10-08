import fs from 'node:fs';
import {Delaunay} from 'd3-delaunay';
import clipping from 'polygon-clipping';
const groups = {
 ger:['German Empire', [['berlin','Berlin',13.405,52.52,30],['alsace','Alsace-Lorraine',7.75,48.58,15],['rhineland','Rhineland',6.96,50.94,15],['bavaria','Bavaria',11.58,48.14,15],['prussia','East Prussia',20.5,54.7,15],['silesia','Silesia',17.04,51.1,10],['hamburg','Northern Germany',9.99,53.55,10]]],
 fra:['France',[['paris','Paris',2.35,48.86,30],['nancy','Lorraine',6.18,48.69,15],['lyon','Lyon',4.84,45.76,10],['bordeaux','Bordeaux',-0.58,44.84,10],['marseille','Marseille',5.37,43.3,10],['brittany','Brittany',-1.68,48.11,5]]],
 gbr:['United Kingdom of Great Britain and Ireland',[['london','London',-0.13,51.51,30],['manchester','Northern England',-2.24,53.48,15],['edinburgh','Scotland',-3.19,55.95,10],['dublin','Ireland',-6.26,53.35,10]]],
 rus:['Russian Empire',[['petrograd','St Petersburg',30.31,59.94,25],['moscow','Moscow',37.62,55.75,25],['warsaw','Congress Poland',21.01,52.23,15],['riga','Baltic provinces',24.11,56.95,10],['helsinki','Grand Duchy of Finland',24.94,60.17,10],['kyiv','Kyiv',30.52,50.45,15],['minsk','Minsk',27.56,53.9,10],['odessa','Odessa',30.73,46.48,10],['caucasus','Caucasus',44.8,41.7,10]]],
 auh:['Austro-Hungarian Empire',[['vienna','Vienna',16.37,48.21,25],['budapest','Budapest',19.04,47.5,20],['prague','Bohemia',14.42,50.08,15],['galicia','Galicia',24.03,49.84,15],['sarajevo','Bosnia-Herzegovina',18.41,43.86,10],['zagreb','Croatia',15.98,45.81,10],['trieste','Trieste',13.77,45.65,10],['transylvania','Transylvania',23.59,46.77,10]]],
 ott:['Ottoman Empire',[['constantinople','Constantinople',28.98,41.01,25],['ankara','Anatolia',32.86,39.93,15],['smyrna','Smyrna',27.14,38.42,10],['eastern-anatolia','Eastern Anatolia',41.27,39.9,10]]],
 ita:['Kingdom of Italy',[['rome','Rome',12.5,41.9,20],['milan','Lombardy',9.19,45.46,15],['venice','Veneto',12.33,45.44,10],['naples','Southern Italy',14.27,40.85,10],['sicily','Sicily',13.36,38.12,5],['sardinia','Sardinia',9.12,39.22,5]]],
 spa:['Spain',[['madrid','Madrid',-3.7,40.42,20],['barcelona','Catalonia',2.17,41.39,10],['seville','Andalusia',-5.98,37.39,10]]],
 por:['Portugal',[['lisbon','Lisbon',-9.14,38.72,15],['porto','Northern Portugal',-8.61,41.15,5]]],
 bel:['Belgium',[['brussels','Belgium',4.35,50.85,10]]],net:['Netherlands',[['amsterdam','Netherlands',4.9,52.37,10]]],lux:['Luxembourg',[['luxembourg','Luxembourg',6.13,49.61,5]]],swi:['Switzerland',[['bern','Switzerland',7.45,46.95,10]]],
 den:['Denmark',[['copenhagen','Denmark',12.57,55.68,10]]],nor:['Norway',[['oslo','Norway',10.75,59.91,10]]],swe:['Sweden',[['stockholm','Sweden',18.07,59.33,10]]],
 ser:['Serbia',[['belgrade','Belgrade',20.46,44.82,10],['nis','Southern Serbia',21.9,43.32,5]]],mon:['Montenegro',[['cetinje','Montenegro',18.92,42.39,5]]],rom:['Romania',[['bucharest','Wallachia',26.1,44.43,10],['moldavia','Moldavia',27.59,47.16,5]]],bul:['Bulgaria',[['sofia','Sofia',23.32,42.7,10],['plovdiv','Thrace',24.75,42.14,5]]],gre:['Greece',[['athens','Southern Greece',23.73,37.98,10],['salonika','Macedonia',22.94,40.64,5]]],alb:['Albania',[['tirana','Albania',19.82,41.33,5]]]
};
const original=JSON.parse(fs.readFileSync('public/data/world_1914.geojson','utf8'));
const bounds=[[[-12,35],[46,35],[46,71],[-12,71],[-12,35]]];
const regions=[],features=[],countryFeatures=[];
for(const [owner,[name,sites]] of Object.entries(groups)){
 const found=original.features.filter(f=>f.properties.NAME===name || (owner==='rus' && ['Finland','Georgia','Armenia','Azerbaijan'].includes(f.properties.NAME)));
 if(!found.length)throw new Error('Missing historical geometry '+name);
 const pieces=found.map(f=>clipping.intersection(f.geometry.coordinates,bounds)).filter(p=>p.length);
 const geom=clipping.union(...pieces);
 countryFeatures.push({type:'Feature',properties:{owner},geometry:{type:'MultiPolygon',coordinates:geom}});
 const delaunay=Delaunay.from(sites,s=>s[2]*0.62,s=>s[3]);
 const voronoi=delaunay.voronoi([-12*0.62,35,46*0.62,71]);
 for(let i=0;i<sites.length;i++){
  const [id,label,lon,lat,vp]=sites[i];
  const cell=voronoi.cellPolygon(i).map(([x,y])=>[x/0.62,y]);
  const shape=clipping.intersection(geom,[cell]);
  const terrain=['swi','mon','nor','alb'].includes(owner)||['bavaria','transylvania','eastern-anatolia'].includes(id)?'mountains':id==='moscow'||id==='riga'?'forest':vp>=25?'urban':'plains';
  regions.push({id,name:label,owner,vp,terrain,population:Math.round((vp+5)*90000),infrastructure:vp>=20?4:2,neighbors:[...delaunay.neighbors(i)].filter(j=>j>=0&&sites[j]).map(j=>sites[j][0]),seaNeighbors:[],location:[lon,lat]});
  features.push({type:'Feature',properties:{id,owner,name:label},geometry:{type:'MultiPolygon',coordinates:shape}});
 }
}
const links=[['alsace','nancy'],['alsace','bern'],['rhineland','nancy'],['rhineland','brussels'],['rhineland','luxembourg'],['rhineland','amsterdam'],['hamburg','copenhagen'],['bavaria','prague'],['bavaria','vienna'],['bavaria','bern'],['silesia','prague'],['silesia','warsaw'],['silesia','galicia'],['prussia','warsaw'],['prussia','riga'],['nancy','brussels'],['nancy','luxembourg'],['nancy','bern'],['lyon','bern'],['lyon','milan'],['marseille','milan'],['bordeaux','barcelona'],['bordeaux','madrid'],['brussels','amsterdam'],['brussels','luxembourg'],['madrid','porto'],['seville','lisbon'],['milan','bern'],['venice','trieste'],['milan','vienna'],['galicia','warsaw'],['galicia','kyiv'],['transylvania','moldavia'],['transylvania','bucharest'],['sarajevo','belgrade'],['sarajevo','cetinje'],['budapest','belgrade'],['belgrade','bucharest'],['nis','sofia'],['nis','salonika'],['nis','tirana'],['nis','cetinje'],['cetinje','tirana'],['tirana','salonika'],['bucharest','sofia'],['moldavia','odessa'],['sofia','salonika'],['plovdiv','salonika'],['plovdiv','constantinople'],['eastern-anatolia','caucasus'],['oslo','stockholm'],['stockholm','helsinki']];
const byId=Object.fromEntries(regions.map(r=>[r.id,r]));
for(const r of regions)r.neighbors=r.neighbors.filter(id=>!['sardinia','sicily','dublin'].includes(id)&&!['sardinia','sicily','dublin'].includes(r.id));
for(const [a,b]of links){byId[a].neighbors.push(b);byId[b].neighbors.push(a);}
// Explicit abstract naval transport routes; never treated as land borders.
for(const [a,b]of [['london','brittany'],['london','brussels'],['london','dublin'],['edinburgh','oslo'],['copenhagen','stockholm'],['naples','sicily'],['rome','sardinia']]){byId[a].seaNeighbors.push(b);byId[b].seaNeighbors.push(a);}
fs.writeFileSync('shared/map-data.json',JSON.stringify({regions}));
fs.writeFileSync('public/data/europe-regions.geojson',JSON.stringify({type:'FeatureCollection',features,countryFeatures}));
console.log(`Generated ${regions.length} strategic regions from historical 1914 outlines.`);
