import React, { useEffect, useState  } from 'react';
import {
  View,
} from "react-native";
import { Button, Select, Input, Typography, Card, Image, message } from 'antd';
const { Title } = Typography;
 
const options = [
	{ value: '油画', label: '油画' },
	{ value: '插画', label: '插画' },
	{ value: '卡通', label: '卡通' },
	{ value: '科幻', label: '科幻' },
	{ value: '古风', label: '古风' },
	{ value: '高清', label: '高清' },
	{ value: '壁纸', label: '壁纸' },
	{ value: '色彩艳丽', label: '色彩艳丽' },
	{ value: '黑白', label: '黑白' },
]

const InspireMode = (props) => {
	const {localurl} = props;
	const [prompt, setPrompt] = useState({
		"one": '',
		"two": '',
		"three": ''
	});
	const [style, setStyle] = useState({
		"one": '',
		"two": '',
		"three": ''
	}) ;
	const [list, setList] = useState({
		"one": [],
		"two": [],
		"three": []
	});
	const [loadings, setLoadings] = useState([]);
	const [id, setId] = useState('');
	const [idStatus, setIdStatus] = useState('basic');

	const onChange = (e) => {
		setId(e.target.value);
	};

	const sections = ["one", "two", "three"];

	useEffect(() => {
		console.log("Mounting...");
	},[]);

	const handleGenerate = async (section, index) => {
		console.log(section);
		console.log(idStatus);
		console.log(id);
		console.log(`${prompt[section]},${style[section]}`);
    if(id === ""){
      setIdStatus('error');
      message.error('请输入id');
      return;
    } else {
      setIdStatus('basic');
      setLoadings((prevLoadings) => {
        const newLoadings = [...prevLoadings];
        newLoadings[index] = true;
        return newLoadings;
      });
  
      const response = await fetch(`${localurl}/inspire`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Token f40e401a60e03f6ae459a36e1faa4e5c575819f5'
        },
        body: JSON.stringify({
          id: id,
          prompt: `${prompt[section]},${style[section]}`,
        }),
      });
  
      const msg = await response.json()
      console.log(msg.data)
  
      if(section === "one") {
      	setList((olddata)=>{
      		return{
      		...olddata,
      		one: msg.data
      		}
      	})
      }else if(section === "two"){
      	setList((olddata)=>{
      		return{
      		...olddata,
      		two: msg.data
      		}
      	})
      }else{
      	setList((olddata)=>{
      		return{
      		...olddata,
      		three: msg.data
      		}
      	})
      }
  
      setLoadings((prevLoadings) => {
      	const newLoadings = [...prevLoadings];
      	newLoadings[index] = false;
      	return newLoadings;
      });
    }
	};

	return (
		<>
			<Title style={{ margin: 10 }} level={3}>AI艺术疗愈</Title>
      <span>{"id: "}
			  <Input placeholder="请输入id" status={idStatus} onChange={onChange} style={{width: 200}} />
      </span>
			{sections.map((section, index) => (
				<View style={{ flexDirection: "row", margin: "2%" }}>
					<Card style={{ width: "40%" }}>
						<Title style={{ margin: 10 }} level={5}>图片{index+1}</Title>
						<Input
							size="large"
							onChange={(e) => {
								if(section === "one") {
									setPrompt((olddata)=>{
										return{
										...olddata,
										one: e.target.value
										}
									})
								}else if(section === "two"){
									setPrompt((olddata)=>{
										return{
										...olddata,
										two: e.target.value
										}
									})
								}else{
									setPrompt((olddata)=>{
										return{
										...olddata,
										three: e.target.value
										}
									})
								}
								
							}}
							style={{ width: '100%', marginTop: "10px" }}
							placeholder="文字描述"
							value={prompt[section]}
						/>
						<Select
							size="large"
							mode="multiple"
							allowClear
							style={{ width: '60%', maxWidth: '70%', marginTop: "15px", marginRight: "10px" }}
							onChange={(value) => {
								if(section === "one") {
									setStyle((olddata)=>{
										return{
										...olddata,
										one: `${value}`
										}
									})
								}else if(section === "two"){
									setStyle((olddata)=>{
										return{
										...olddata,
										two: `${value}`
										}
									})
								}else{
									setStyle((olddata)=>{
										return{
										...olddata,
										three: `${value}`
										}
									})
								}
							}}
							placeholder="风格，多选"
							options={options}
						/>
						<Button 
							type="primary" 
							style={{ width: '30%', marginTop: "15px" }} 
							onClick = {() => handleGenerate(section, index)}
							loading={loadings[index]}
						>
							生成 / 换一批
						</Button>
					</Card>
					<Card style={{ width: "60%" }}>
						<Image.PreviewGroup>
							<Image width={"33%"} src={list[section][0]} />
							<Image width={"33%"} src={list[section][1]} />
							<Image width={"33%"} src={list[section][2]} />
						</Image.PreviewGroup>
					</Card>
				</View>
      ))}
		</>
	);
}
 
export default InspireMode;

